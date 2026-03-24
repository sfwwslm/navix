/**
 * 通用服务端响应结构，与 Rust `ApiResponse<T>` 对齐。
 */
export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data?: T | null;
}
