import {
  Settings,
  Code,
  MessagesSquare,
  WandSparkles,
  AudioLinesIcon,
  SquareSlashIcon,
  MonitorIcon,
  HomeIcon,
  PowerIcon,
  CoffeeIcon,
  GlobeIcon,
  BugIcon,
  MessageSquareTextIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { XIcon, GithubIcon } from "@/components";

export const useMenuItems = () => {
  const menu: {
    icon: React.ElementType;
    label: string;
    href: string;
    count?: number;
  }[] = [
    {
      icon: HomeIcon,
      label: "控制台",
      href: "/dashboard",
    },
    {
      icon: MessagesSquare,
      label: "对话",
      href: "/chats",
    },
    {
      icon: WandSparkles,
      label: "系统提示词",
      href: "/system-prompts",
    },
    {
      icon: Settings,
      label: "应用设置",
      href: "/settings",
    },
    {
      icon: MessageSquareTextIcon,
      label: "响应设置",
      href: "/responses",
    },
    {
      icon: MonitorIcon,
      label: "截图",
      href: "/screenshot",
    },
    {
      icon: AudioLinesIcon,
      label: "音频",
      href: "/audio",
    },
    {
      icon: SquareSlashIcon,
      label: "光标与快捷键",
      href: "/shortcuts",
    },
    {
      icon: Code,
      label: "开发空间",
      href: "/dev-space",
    },
  ];

  const footerItems = [
    {
      icon: BugIcon,
      label: "反馈问题",
      href: "https://github.com/iamsrikanthnani/pluely/issues/new?template=bug-report.yml",
    },
    {
      icon: PowerIcon,
      label: "退出 Pluely",
      action: async () => {
        await invoke("exit_app");
      },
    },
  ];

  const footerLinks: {
    title: string;
    icon: React.ElementType;
    link: string;
  }[] = [
    {
      title: "官网",
      icon: GlobeIcon,
      link: "https://pluely.com",
    },
    {
      title: "Github",
      icon: GithubIcon,
      link: "https://github.com/iamsrikanthnani/pluely",
    },
    {
      title: "请我喝咖啡",
      icon: CoffeeIcon,
      link: "https://buymeacoffee.com/srikanthnani",
    },
    {
      title: "在 X 关注我",
      icon: XIcon,
      link: "https://x.com/srikanthnani",
    },
  ];

  return {
    menu,
    footerItems,
    footerLinks,
  };
};
