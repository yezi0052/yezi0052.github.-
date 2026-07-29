import "./globals.css";

export const metadata = {
  title: "科晟墙板全屋定制 | 碳晶板 防撞板 SPC板 快家整装",
  description:
    "科晟墙板提供全屋定制墙板、碳晶板、防撞板、SPC板、电视背景墙和快家整装服务，覆盖设计、选材、生产、安装和售后。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
