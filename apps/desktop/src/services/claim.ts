import { log } from "@/utils/logger";
import { User } from "./user";
import { reassignAnonymousDataToUserRecord } from "./database/commands/claim";

/**
 * @function reassignAnonymousDataToUser
 * @description 将所有匿名数据的所有权重新分配给指定的用户，并智能处理冲突。
 * 此最终版本正确处理了匿名默认分类的保留逻辑。
 * @param {User} user - 当前登录的用户对象。
 */
export const reassignAnonymousDataToUser = async (
  user: User,
): Promise<void> => {
  log.info(
    `[数据认领] 用户 "${user.username}" (${user.uuid}) 开始认领匿名数据...`,
  );

  try {
    await reassignAnonymousDataToUserRecord(user.uuid);
    log.info("[数据认领] ✔️✔️✔️ 匿名数据认领全部完成！");
  } catch (error) {
    log.error(`[数据认领] ❌ 在认领过程中发生错误: ${String(error)}`);
    throw error;
  }
};
