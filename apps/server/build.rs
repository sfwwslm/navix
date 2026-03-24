use anyhow::Result;
use shadow_rs::ShadowBuilder;

fn main() -> Result<()> {
    // 注入构建时信息
    ShadowBuilder::builder()
        .deny_const(Default::default())
        .build()
        .unwrap();

    // 如果目标是 Windows，则设置应用程序图标
    if cfg!(target_os = "windows") {
        let mut res = winres::WindowsResource::new();
        res.set_icon("../web/public/icon.ico");
        res.compile().expect("Failed to compile Windows resources");
    }

    Ok(())
}
