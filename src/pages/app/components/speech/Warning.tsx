import { useState } from "react";
import {
  InfoIcon,
  ChevronDownIcon,
  KeyboardIcon,
  AudioWaveformIcon,
  MicIcon,
  CameraIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WarningProps {
  isVadMode: boolean;
}

export const Warning = ({ isVadMode }: WarningProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isMac = navigator.platform.toLowerCase().includes("mac");
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <InfoIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">帮助与键盘快捷键</span>
        </div>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Current Mode Info */}
          <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5">
            {isVadMode ? (
              <AudioWaveformIcon className="w-4 h-4 text-primary mt-0.5" />
            ) : (
              <MicIcon className="w-4 h-4 text-primary mt-0.5" />
            )}
            <div>
              <p className="text-xs font-medium">
                {isVadMode ? "自动检测模式" : "手动模式"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isVadMode
                  ? "自动从系统音频中检测语音。当有人说话时，将自动捕获并转录。"
                  : "按下录音按钮或使用键盘快捷键手动控制录音。"}
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <KeyboardIcon className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                键盘快捷键
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                <span className="text-muted-foreground">向下滚动</span>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                  ↓
                </kbd>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                <span className="text-muted-foreground">向上滚动</span>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                  ↑
                </kbd>
              </div>
              {!isVadMode && (
                <>
                  <div className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                    <span className="text-muted-foreground">开始/停止</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                      Enter
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                    <span className="text-muted-foreground">开始录音</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                      Space
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                    <span className="text-muted-foreground">丢弃</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                      Esc
                    </kbd>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/50">
                <span className="text-muted-foreground">切换视图</span>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                  {modKey}+K
                </kbd>
              </div>
            </div>
          </div>

          {/* Screenshot Feature */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <CameraIcon className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                截图功能
              </span>
            </div>
            <div className="p-2 rounded-md bg-primary/5 text-[10px] text-muted-foreground space-y-1">
              <p>
                截图功能：捕获当前屏幕并附加到下一次转录中。
              </p>
              <p>
                AI 将同时接收转录的音频和截图图片，使其能够根据你正在查看的内容提供更有针对性的响应。
              </p>
              <p className="text-[9px] opacity-70">
                截图在每条消息发送后自动清除。
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t border-border/50">
            <p>
              <strong>提示：</strong>面试时使用自动检测模式可实现免提操作。
            </p>
            <p>
              <strong>提示：</strong>需要精确控制转录内容时使用手动模式。
            </p>
            <p>
              <strong>提示：</strong>快捷操作可让你一键发送后续提示。
            </p>
            <p>
              <strong>提示：</strong>使用截图功能与 AI 分享屏幕内容，获取更相关的响应。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
