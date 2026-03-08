// Pluely API 已禁用，中国化版本直接使用自定义 Provider 直连模式
export async function shouldUsePluelyAPI(): Promise<boolean> {
  return false;
}
