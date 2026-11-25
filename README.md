# Gemini 4 Neon · 手工定格立体书（1080×1080）

参考 [nolangz/popup-book-constraints](https://github.com/nolangz/popup-book-constraints) 风格制作的 **1080×1080（1:1）** 34 秒定格纸艺立体书介绍视频，基于 [HyperFrames](https://hyperframes.heygen.com) + Three.js。

## 内容结构（34.0s · 5 幕）

1. **两难抉择（0.0–5.3s）**：胡桃木桌上的卡纸天平对比轻快的 Hydrogen 与沉重的 Carbon。
2. **Neon 登场装订（5.4–10.0s）**：Gemini 4 Neon（Ne · 10）在 H 与 C 之间亮起，五页核心能力叠入布面烫金立体书。
3. **开卷亮牌（10.1–12.5s）**：书背立起 90°，五条彩色拉条扇形展开。
4. **五大核心机关（12.6–27.7s）**：
   - `1M 上下文`：1,048,576 Token 星空标尺卷轴 + 双层剪纸波浪带
   - `可调思考`：`LOW / MED / HIGH / XHIGH` 纸艺刻度盘 + 四阶折纸能量柱
   - `原生多模态`：四联手风琴折页 + 百叶窗翻片（TEXT / IMAGE / AUDIO / VIDEO·PDF）+ 迷你纸艺道具
   - `Agent 编排`：Neon 指挥塔 + CODE / DATA / LAB 子智能体 + 跳跃红旗
   - `性能与成本`：前沿帕累托立牌 + `$3/$15 · -95% 缓存` 吊牌 + 五连红勾
5. **破纸立起（27.8–34.0s）**：平庸同质化灰纸淹没桌面，五条彩色拉条顶出并轰然弹开立体书，聚光灯定格收尾。

## 特色工艺

- **融入式 3D 桌面手撕纸艺字幕**：底部字幕直接作为 3D 实体手撕棉纸牌（配对应幕次色调的和纸胶带贴角）立于前景胡桃木桌面，真实承接暖聚光灯、投影、景深、12fps 翻起定格微抖、边缘颤动与胶片颗粒（仍可通过 `--variables '{"captions":false}'` 关闭导出干净版）。
- **真实 CC0 录制拟音（via `vibe-motion/sound`）**：从 Freesound 严选 19 条高分高下载 CC0 实录拟音（传统橡皮印章、纸张桌面滑行、精装书合拢、重磅翻页、旋钮机械咔哒、卡纸折展、木质轻敲、纸堆沙沙声与风铃微光），经 FFmpeg 测量瞬态偏移并精准对齐时间轴，与八音盒底乐分层混音。

## 合成变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `captions` | 底部撕纸条中文字幕（`false` 输出干净版） | `true` |
| `fps` | TIME：定格帧率（`8` / `12` / `24`） | `12` |
| `jitter` | SPACE：逐帧手放位移 | `1` |
| `boil` | FORM：GLSL 边缘颤动 | `1` |
| `matter` | MATTER：纸纹与胶片颗粒 | `1` |
| `flicker` | LIGHT：曝光闪烁 | `1` |

## 常用命令

```bash
node scripts/fetch-fonts.mjs                                   # 拉取子集字体
node scripts/sound.mjs                                         # 生成拟音与八音盒音轨
npm run vo:tts                                                 # 用 Edge-TTS 生成 12 句试听配音并三轨混音合入 MP4
npm run vo:mix                                                 # 替换 assets/audio/vo/01~12.* 干声后一键对齐混音合片（免重渲染）
npm run dev                                                    # HyperFrames Studio 实时预览
npm run check                                                  # 静态检查 + 运行时校验
npm run render                                                 # 渲染 1080×1080 带字幕 MP4
npx --yes hyperframes@0.8.64 render --variables '{"captions":false}'  # 渲染无字幕干净版
```

> 配音口播节奏与高质量干声一键替换说明见 [VO_SCRIPT.md](VO_SCRIPT.md)。

> **Windows 提示**：若自带 `chrome-headless-shell` 缺少系统运行库，可通过环境变量直接指向本机 Chrome：
> ```powershell
> $env:HYPERFRAMES_BROWSER_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
> npx --yes hyperframes@0.8.64 render -w 2 -o renders\gemini-4-neon-1080x1080.mp4
> ```
