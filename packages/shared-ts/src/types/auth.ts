/**
 * JWT claims / welcome 响应体数据结构。
 */
export interface Claims {
  sub: string;
  username: string;
  exp: number;
  iss: string;
  roles?: string[];
}

/**
 * 登录接口成功响应数据。
 */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  refreshToken: string;
}
