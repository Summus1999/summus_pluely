import { Button, Card, CardContent, CardDescription, CardTitle } from "./ui";

const Contribute = () => {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4 p-4 py-0 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2 md:max-w-[70%]">
          <CardTitle className="text-xs lg:text-sm">
            为 Pluely 做贡献，获得终身使用权
          </CardTitle>
          <CardDescription className="text-[10px] lg:text-xs">
            修复一个列出的关键问题，即可获得价值 $120 的终身 Dev Pro 许可证。仅限我们贡献页面上列出的问题。详情请访问 pluely.com/contribute
          </CardDescription>
        </div>
        <Button asChild className="w-full md:w-auto text-[10px] lg:text-xs">
          <a
            href="https://pluely.com/contribute"
            rel="noopener noreferrer"
            target="_blank"
          >
            pluely.com/contribute
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

export default Contribute;
