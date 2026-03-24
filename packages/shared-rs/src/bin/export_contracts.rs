//! 从 `shared-rs/src/dto` 解析 Rust AST 并导出 TypeScript 契约文件。

use anyhow::{Context, Result};
use convert_case::{Case, Casing};
use std::collections::{BTreeMap, BTreeSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use syn::{
    Attribute, Fields, GenericArgument, Item, ItemEnum, ItemStruct, LitStr, PathArguments, Type,
};
use walkdir::WalkDir;

#[derive(Debug, Clone)]
struct StructDef {
    name: String,
    generic_params: Vec<String>,
    fields: Vec<FieldDef>,
}

#[derive(Debug, Clone)]
struct FieldDef {
    name: String,
    ty: Type,
}

#[derive(Debug, Clone)]
struct EnumDef {
    name: String,
    variants: Vec<EnumVariantDef>,
}

#[derive(Debug, Clone)]
struct EnumVariantDef {
    name: String,
    wire_value: String,
}

fn main() -> Result<()> {
    let output = env::args()
        .nth(1)
        .context("usage: export_contracts <output_ts_path>")?;

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dto_dir = manifest_dir.join("src").join("dto");

    let (structs, enums) = parse_dto_dir(&dto_dir)?;
    let ts = render_contracts_ts(&structs, &enums)?;

    let output_path = PathBuf::from(output);
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("failed to create output dir: {}", parent.display()))?;
    }
    fs::write(&output_path, ts)
        .with_context(|| format!("failed to write: {}", output_path.display()))?;

    println!("contracts exported to {}", output_path.display());
    Ok(())
}

/// 扫描 DTO 目录并提取公开结构体与枚举定义。
fn parse_dto_dir(dto_dir: &Path) -> Result<(Vec<StructDef>, Vec<EnumDef>)> {
    let mut structs = Vec::new();
    let mut enums = Vec::new();

    for entry in WalkDir::new(dto_dir)
        .into_iter()
        .filter_map(std::result::Result::ok)
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("rs") {
            continue;
        }
        if path.file_name().and_then(|s| s.to_str()) == Some("mod.rs") {
            continue;
        }

        let content = fs::read_to_string(path)
            .with_context(|| format!("failed to read dto file: {}", path.display()))?;
        let file = syn::parse_file(&content)
            .with_context(|| format!("failed to parse dto file: {}", path.display()))?;

        for item in file.items {
            match item {
                Item::Struct(item_struct) => {
                    // 只导出公开结构体，避免把内部实现细节暴露到 TS 契约。
                    if !matches!(item_struct.vis, syn::Visibility::Public(_)) {
                        continue;
                    }
                    if let Some(def) = parse_struct(item_struct) {
                        structs.push(def);
                    }
                }
                Item::Enum(item_enum) => {
                    // 同上：仅导出公开枚举。
                    if !matches!(item_enum.vis, syn::Visibility::Public(_)) {
                        continue;
                    }
                    if let Some(def) = parse_enum(item_enum) {
                        enums.push(def);
                    }
                }
                _ => {}
            }
        }
    }

    // 固定输出顺序，保证生成结果可复现，便于 CI 做 diff 校验。
    structs.sort_by(|a, b| a.name.cmp(&b.name));
    enums.sort_by(|a, b| a.name.cmp(&b.name));
    Ok((structs, enums))
}

/// 解析命名字段结构体。
fn parse_struct(item: ItemStruct) -> Option<StructDef> {
    let mut fields_out = Vec::new();
    let fields = match item.fields {
        Fields::Named(named) => named.named,
        _ => return None,
    };

    for field in fields {
        let name = field.ident.as_ref()?.to_string();
        fields_out.push(FieldDef { name, ty: field.ty });
    }

    let generic_params = item
        .generics
        .type_params()
        .map(|p| p.ident.to_string())
        .collect::<Vec<_>>();

    Some(StructDef {
        name: item.ident.to_string(),
        generic_params,
        fields: fields_out,
    })
}

/// 解析纯值枚举。
fn parse_enum(item: ItemEnum) -> Option<EnumDef> {
    let mut variants = Vec::new();

    for variant in item.variants {
        // 仅支持“纯值枚举”导出到 TS；带数据的变体需要单独设计映射协议。
        if !matches!(variant.fields, Fields::Unit) {
            return None;
        }
        let name = variant.ident.to_string();
        let wire_value = parse_serde_rename(&variant.attrs).unwrap_or_else(|| name.clone());
        variants.push(EnumVariantDef { name, wire_value });
    }

    Some(EnumDef {
        name: item.ident.to_string(),
        variants,
    })
}

/// 提取 `#[serde(rename = \"...\")]` 的线传值。
fn parse_serde_rename(attrs: &[Attribute]) -> Option<String> {
    for attr in attrs {
        if !attr.path().is_ident("serde") {
            continue;
        }
        let mut out: Option<String> = None;
        let _ = attr.parse_nested_meta(|meta| {
            if meta.path.is_ident("rename") {
                let value: LitStr = meta.value()?.parse()?;
                out = Some(value.value());
            }
            Ok(())
        });
        if out.is_some() {
            return out;
        }
    }
    None
}

/// 渲染 TypeScript 类型与 Zod schema。
fn render_contracts_ts(structs: &[StructDef], enums: &[EnumDef]) -> Result<String> {
    let mut out = String::new();
    out.push_str("import { z } from \"zod\";\n\n");

    let enum_names: BTreeSet<String> = enums.iter().map(|e| e.name.clone()).collect();
    let struct_names: BTreeSet<String> = structs.iter().map(|s| s.name.clone()).collect();

    for en in enums {
        // 错误码枚举导出为统一常量，客户端按稳定 code 分支，不依赖 message。
        let const_name = if en.name == "AppErrorCode" {
            "APP_ERROR_CODES".to_string()
        } else {
            en.name.clone()
        };

        out.push_str(&format!("export const {} = {{\n", const_name));
        for v in &en.variants {
            out.push_str(&format!("  {}: \"{}\",\n", v.name, v.wire_value));
        }
        out.push_str("} as const;\n");

        if en.name == "AppErrorCode" {
            out.push_str(&format!(
                "export type AppErrorCode = (typeof {})[keyof typeof {}];\n",
                const_name, const_name
            ));
            out.push_str(&format!(
                "export const appErrorCodeSchema = z.enum(Object.values({}) as [string, ...string[]]);\n\n",
                const_name
            ));
        } else {
            let schema_name = format!("{}Schema", en.name.to_case(Case::Camel));
            out.push_str(&format!(
                "export const {} = z.enum(Object.values({}) as [string, ...string[]]);\n",
                schema_name, const_name
            ));
            out.push_str(&format!(
                "export type {} = z.infer<typeof {}>;\n\n",
                en.name, schema_name
            ));
        }
    }

    let mut struct_schema_names = BTreeMap::new();
    for st in structs {
        struct_schema_names.insert(
            st.name.clone(),
            format!("{}Schema", st.name.to_case(Case::Camel)),
        );
    }

    for st in structs {
        if st.name == "ValidationDetails" {
            continue;
        }

        if st.generic_params.is_empty() {
            out.push_str(&format!("export interface {} {{\n", st.name));
        } else {
            out.push_str(&format!(
                "export interface {}<{}> {{\n",
                st.name,
                st.generic_params.join(", ")
            ));
        }
        for f in &st.fields {
            let ts_type = type_to_ts(&f.ty, &enum_names, &struct_names);
            out.push_str(&format!("  {}: {};\n", f.name, ts_type));
        }
        out.push_str("}\n");

        let schema_name = struct_schema_names
            .get(&st.name)
            .context("missing schema name")?;

        if st.generic_params.is_empty() {
            out.push_str(&format!("export const {} = z.object({{\n", schema_name));
            for f in &st.fields {
                let z_expr = type_to_zod(&f.ty, &enum_names, &struct_schema_names);
                out.push_str(&format!("  {}: {},\n", f.name, z_expr));
            }
            out.push_str("});\n");
            out.push_str(&format!(
                "export type {}Dto = z.infer<typeof {}>;\n\n",
                st.name, schema_name
            ));
        } else if st.name == "ApiResponse" && st.generic_params == vec!["T"] {
            out.push_str(
                "export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({\n",
            );
            for f in &st.fields {
                if f.name == "data" {
                    out.push_str("  data: dataSchema.nullable().optional(),\n");
                } else {
                    let z_expr = type_to_zod(&f.ty, &enum_names, &struct_schema_names);
                    out.push_str(&format!("  {}: {},\n", f.name, z_expr));
                }
            }
            out.push_str("});\n\n");
        }
    }

    out.push_str(
        "export function isErrorCode(code: string, target: AppErrorCode): boolean {\n  return code === target;\n}\n",
    );

    Ok(out)
}

/// 将 Rust 类型映射为 TypeScript 类型。
fn type_to_ts(ty: &Type, enums: &BTreeSet<String>, structs: &BTreeSet<String>) -> String {
    match ty {
        Type::Path(type_path) => {
            let seg = type_path.path.segments.last().map(|s| s.ident.to_string());
            if let Some(name) = seg {
                match name.as_str() {
                    "String" => "string".to_string(),
                    "bool" => "boolean".to_string(),
                    "u8" | "u16" | "u32" | "u64" | "usize" | "i8" | "i16" | "i32" | "i64"
                    | "isize" | "f32" | "f64" => "number".to_string(),
                    "Option" => {
                        if let Some(inner) = first_type_arg(type_path) {
                            let inner_ts = type_to_ts(inner, enums, structs);
                            if inner_ts.ends_with(" | null") {
                                inner_ts
                            } else {
                                format!("{inner_ts} | null")
                            }
                        } else {
                            "unknown".to_string()
                        }
                    }
                    "Vec" => {
                        if let Some(inner) = first_type_arg(type_path) {
                            format!("{}[]", type_to_ts(inner, enums, structs))
                        } else {
                            "unknown[]".to_string()
                        }
                    }
                    "BTreeMap" => {
                        if let Some((_, value)) = map_type_args(type_path) {
                            format!("Record<string, {}>", type_to_ts(value, enums, structs))
                        } else {
                            "Record<string, unknown>".to_string()
                        }
                    }
                    "Value" => "unknown".to_string(),
                    "ValidationDetails" => "Record<string, string[]> | null".to_string(),
                    _ if enums.contains(&name) || structs.contains(&name) => name,
                    _ => name,
                }
            } else {
                "unknown".to_string()
            }
        }
        Type::Tuple(tuple) if tuple.elems.is_empty() => "null".to_string(),
        _ => "unknown".to_string(),
    }
}

/// 将 Rust 类型映射为 Zod 表达式。
fn type_to_zod(
    ty: &Type,
    enums: &BTreeSet<String>,
    struct_schema_names: &BTreeMap<String, String>,
) -> String {
    match ty {
        Type::Path(type_path) => {
            let seg = type_path.path.segments.last().map(|s| s.ident.to_string());
            if let Some(name) = seg {
                match name.as_str() {
                    "String" => "z.string()".to_string(),
                    "bool" => "z.boolean()".to_string(),
                    "u8" | "u16" | "u32" | "u64" | "usize" | "i8" | "i16" | "i32" | "i64"
                    | "isize" | "f32" | "f64" => "z.number()".to_string(),
                    "Option" => {
                        if let Some(inner) = first_type_arg(type_path) {
                            let inner_zod = type_to_zod(inner, enums, struct_schema_names);
                            if inner_zod.ends_with(".nullable().optional()") {
                                inner_zod
                            } else {
                                format!("{inner_zod}.nullable().optional()")
                            }
                        } else {
                            "z.unknown().nullable().optional()".to_string()
                        }
                    }
                    "Vec" => {
                        if let Some(inner) = first_type_arg(type_path) {
                            format!(
                                "z.array({})",
                                type_to_zod(inner, enums, struct_schema_names)
                            )
                        } else {
                            "z.array(z.unknown())".to_string()
                        }
                    }
                    "BTreeMap" => {
                        if let Some((_, value)) = map_type_args(type_path) {
                            format!(
                                "z.record(z.string(), {})",
                                type_to_zod(value, enums, struct_schema_names)
                            )
                        } else {
                            "z.record(z.string(), z.unknown())".to_string()
                        }
                    }
                    "Value" => "z.unknown()".to_string(),
                    "ValidationDetails" => {
                        "z.record(z.string(), z.array(z.string())).nullable().optional()"
                            .to_string()
                    }
                    _ if enums.contains(&name) => {
                        if name == "AppErrorCode" {
                            "appErrorCodeSchema".to_string()
                        } else {
                            format!("{}Schema", name.to_case(Case::Camel))
                        }
                    }
                    _ => {
                        if let Some(schema_name) = struct_schema_names.get(&name) {
                            // 使用 lazy 打破类型之间的声明顺序依赖/循环引用问题。
                            format!("z.lazy(() => {})", schema_name)
                        } else {
                            "z.unknown()".to_string()
                        }
                    }
                }
            } else {
                "z.unknown()".to_string()
            }
        }
        Type::Tuple(tuple) if tuple.elems.is_empty() => "z.null()".to_string(),
        _ => "z.unknown()".to_string(),
    }
}

/// 获取泛型第一个类型参数。
fn first_type_arg(type_path: &syn::TypePath) -> Option<&Type> {
    let seg = type_path.path.segments.last()?;
    match &seg.arguments {
        PathArguments::AngleBracketed(args) => args.args.iter().find_map(|arg| match arg {
            GenericArgument::Type(ty) => Some(ty),
            _ => None,
        }),
        _ => None,
    }
}

/// 获取 `Map<K, V>` 的 key/value 类型参数。
fn map_type_args(type_path: &syn::TypePath) -> Option<(&Type, &Type)> {
    let seg = type_path.path.segments.last()?;
    match &seg.arguments {
        PathArguments::AngleBracketed(args) => {
            let mut it = args.args.iter().filter_map(|arg| match arg {
                GenericArgument::Type(ty) => Some(ty),
                _ => None,
            });
            let key = it.next()?;
            let value = it.next()?;
            Some((key, value))
        }
        _ => None,
    }
}
