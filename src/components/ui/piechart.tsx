"use client";

import { Pie, PieChart, PieLabelRenderProps } from "recharts";
import { TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type ChartDataEntry = {
  category: string;
  count: number;
  fill: string;
};

type CategorizationPieChartProps = {
  data: ChartDataEntry[];
};

export function CategorizationPieChart({ data }: CategorizationPieChartProps) {
  const totalCount = data.reduce((acc, item) => acc + item.count, 0);

  const chartConfig: ChartConfig = {
    count: { label: "Files" },
    ...Object.fromEntries(
      data.map((entry) => [
        entry.category,
        {
          label: entry.category,
          color: entry.fill,
        },
      ]),
    ),
  };

  const renderLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
    index,
  }: Required<PieLabelRenderProps>) => {
    const RADIAN = Math.PI / 180;
    const radius = Number(outerRadius) + 12;
    const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN);
    const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN);

    const category = data[index].category;
    const percentage = (percent * 100).toFixed(1);

    return (
      <text
        x={x}
        y={y}
        fill="var(--foreground)"
        textAnchor={x > Number(cx) ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${category}: ${percentage}%`}
      </text>
    );
  };

  return (
    <Card className="mt-6 max-w-xl mx-auto">
      <CardHeader className="items-center pb-0">
        <CardTitle>Category Distribution</CardTitle>
        <CardDescription>Results from categorization</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[280px] pb-0"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="category"
              label={renderLabel}
              outerRadius={90}
              stroke="0"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {`Total: ${totalCount} files`} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Each slice shows its percentage share
        </div>
      </CardFooter>
    </Card>
  );
}
