import { Award, BookOpen } from "lucide-react";
import { guildTerminalConfig } from "../../lib/guild-terminal-config";
import {
  buildCyberHash,
  getUnlockedMilestones,
  type GuildLookupResult,
} from "../../lib/guild-terminal-utils";
import { MemberRuntimeClock } from "./runtime-clock";
import styles from "../guild-uptime-terminal.module.css";

export function ArchiveRecord({
  result,
  active,
}: {
  result: GuildLookupResult | null;
  active: boolean;
}) {
  if (!result || result.kind === "error")
    return (
      <div className={styles.archiveEmpty}>
        <BookOpen size={24} aria-hidden="true" />
        <div>
          <h3>找到属于你的同行记录</h3>
          <p>
            输入工号或昵称，查看入会时间、历史见证与勋章；也可以输入日期测算时长。
          </p>
        </div>
      </div>
    );
  const member = result.kind === "member" ? result : null;
  const joinDate = member
    ? member.profile.joinDate
    : result.kind === "date"
      ? result.joinDate
      : "";
  const milestones = member
    ? getUnlockedMilestones(joinDate, guildTerminalConfig.milestones)
    : [];
  return (
    <div className={styles.archiveGrid} data-profile-mode={result.kind}>
      <section className={styles.recordPanel}>
        <div className={styles.recordHeading}>
          <h3>{member ? member.profile.name : "按日期测算"}</h3>
          <span className="paper-tag">
            {member ? "成员档案" : "未绑定成员"}
          </span>
        </div>
        <dl className={styles.recordMeta}>
          {member && (
            <>
              <dt>工号</dt>
              <dd>{member.memberId}</dd>
            </>
          )}
          <dt>入会日期</dt>
          <dd data-profile-date>{joinDate}</dd>
        </dl>
        <MemberRuntimeClock
          joinDate={joinDate}
          memberId={member?.memberId}
          active={active}
        />
        {member && (
          <p className={styles.archiveCode}>
            <span>档案编号</span>
            <code>{buildCyberHash(member.memberId, joinDate)}</code>
          </p>
        )}
      </section>
      <section className={styles.recordPanel}>
        <h3 className={styles.recordSubheading}>
          <BookOpen size={18} aria-hidden="true" />
          历史档案见证
        </h3>
        {member ? (
          milestones.length ? (
            <ul className={styles.milestones}>
              {milestones.map((item) => (
                <li key={`${item.date}-${item.event}`}>
                  <time>{item.date}</time>
                  <p>{item.event}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="paper-muted">暂没有对应的历史事件记录。</p>
          )
        ) : (
          <p className="paper-muted">
            输入有效工号或昵称后，显示对应档案中的历史记录。
          </p>
        )}
        <h3 className={styles.recordSubheading}>
          <Award size={18} aria-hidden="true" />
          纪念勋章
        </h3>
        {member && member.profile.badges?.length ? (
          <ul className={styles.badges}>
            {member.profile.badges.map((badge) => (
              <li key={badge} className="paper-tag yellow">
                {badge}
              </li>
            ))}
          </ul>
        ) : (
          <p className="paper-muted">
            {member
              ? "档案中暂未收录纪念勋章。"
              : "按日期测算不会生成成员勋章。"}
          </p>
        )}
      </section>
    </div>
  );
}
