import { AudioSelection } from "./components";
import { PageLayout } from "@/layouts";
import { getPlatform } from "@/lib";

const getOsInstructions = () => {
  const platform = getPlatform();

  switch (platform) {
    case "macos":
      return {
        mic: "系统偏好设置 → 声音 → 输入",
        audio: "系统偏好设置 → 声音 → 输出",
      };
    case "windows":
      return {
        mic: "设置 → 系统 → 声音 → 输入",
        audio: "设置 → 系统 → 声音 → 输出",
      };
    case "linux":
      return {
        mic: "声音设置 → 输入设备",
        audio: "声音设置 → 输出设备",
      };
    default:
      return {
        mic: "系统声音设置",
        audio: "系统声音设置",
      };
  }
};

const Audio = () => {
  const osInstructions = getOsInstructions();

  return (
    <PageLayout
      title="音频设置"
      description="配置语音交互和系统音频采集的输入输出设备。"
    >
      <AudioSelection />

      <div className="text-xs text-amber-600 bg-amber-500/10 p-3 rounded-md mb-4 space-y-2">
        <p>
          <strong>⚠️ 如果所选设备无法工作：</strong>请检查系统默认音频设置。前往{" "}
          <strong>{osInstructions.mic}</strong> 设置麦克风，前往{" "}
          <strong>{osInstructions.audio}</strong> 设置扬声器/耳机。
          确保在操作系统中将正确的设备设为默认。
        </p>
        <p className="text-amber-600/80">
          <strong>提示：</strong>如果所选设备故障或不可用，Pluely 将自动回退到系统默认音频设备。
        </p>
      </div>
    </PageLayout>
  );
};

export default Audio;
