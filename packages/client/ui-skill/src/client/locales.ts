/** `skill` namespace dictionaries for the dedicated tool row. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'skill'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'row.running': '正在加载 skill',
  'row.failed': 'skill 加载失败',
  'row.stopped': 'skill 加载已中止',
  'row.instructions': '说明',
  'menu.userOnly': '仅用户',
  plus: 'Skill',
  'page.title': 'Skill',
  'page.empty': '还没有技能。把 skill 文件放到技能目录后再来看。',
  'page.emptyImported': '还没有导入的技能',
  'page.builtin': '内置',
  'page.imported': '导入',
  'page.enable': '启用 {name}',
  'page.close': '关闭',
  'page.import': '导入 SKILL.md',
  'page.importInvalid': '不是有效的 SKILL.md',
} satisfies Record<string, string>

/** The skill namespace key union. */
export type SkillKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'row.running': 'Loading skill',
  'row.failed': 'Skill load failed',
  'row.stopped': 'Skill load stopped',
  'row.instructions': 'Instructions',
  'menu.userOnly': 'user-only',
  plus: 'Skill',
  'page.title': 'Skill',
  'page.empty': 'No skills yet. Put skill files in the skills directory, then come back.',
  'page.emptyImported': 'No imported skills yet',
  'page.builtin': 'Built-in',
  'page.imported': 'Imported',
  'page.enable': 'Enable {name}',
  'page.close': 'Close',
  'page.import': 'Import SKILL.md',
  'page.importInvalid': 'Not a valid SKILL.md',
} satisfies Record<SkillKey, string>
