import { format, addYears } from "date-fns";

/**
 * @function getCurrentDateFormatted
 * @description 获取当前日期并格式化为 'YYYY-MM-DD' 字符串
 * @returns {string} 当前日期的YYYY-MM-DD 字符串
 */
export const getCurrentDateFormatted = (): string => {
  return format(new Date(), "yyyy-MM-dd");
};

/**
 * @function getDateTenYearsLaterFormatted
 * @description 获取当前日期十年后并格式化为 'YYYY-MM-DD' 字符串
 * @returns {string} 十年后日期的YYYY-MM-DD 字符串
 */
export const getDateTenYearsLaterFormatted = (): string => {
  const tenYearsLater = addYears(new Date(), 10);
  return format(tenYearsLater, "yyyy-MM-dd");
};
