"use client";

import { APP_NAME } from "@repo/contracts";
import { type FormEvent, useState } from "react";

const DEFAULT_INPUT = "用户注册时必须绑定手机号，密码至少8位";

type RequirementResult = {
  action: string;
  constraints: string[];
  entities: string[];
};

const EXAMPLE_REQUIREMENTS = [
  "用户注册时必须绑定手机号，密码至少8位",
  "管理员可以冻结异常账号，并记录冻结原因",
  "订单支付成功后需要在5分钟内发送短信通知",
];

const resultSections: Array<{
  key: keyof RequirementResult;
  title: string;
  description: string;
}> = [
  {
    key: "action",
    title: "动作",
    description: "系统需要执行或支持的核心行为",
  },
  {
    key: "entities",
    title: "实体",
    description: "需求中出现的业务对象",
  },
  {
    key: "constraints",
    title: "约束",
    description: "规则、条件或边界",
  },
];

export default function Home() {
  const [input, setInput] = useState<string>(DEFAULT_INPUT);
  const [result, setResult] = useState<RequirementResult | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/requirement/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input }),
        }
      );

      if (!res.ok) {
        throw new Error(`请求失败：${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f1] text-[#17201b]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-[#d9ded4] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase text-[#0f766e]">
              {APP_NAME}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-[#101814] sm:text-5xl">
              需求抽取工作台
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#55615a]">
              输入自然语言需求，快速拆出动作、实体和约束，方便继续进入评审、建模或测试用例编写。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-right sm:min-w-80">
            <div>
              <p className="text-2xl font-semibold text-[#101814]">3</p>
              <p className="mt-1 text-xs font-medium text-[#6d766f]">抽取维度</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#101814]">1</p>
              <p className="mt-1 text-xs font-medium text-[#6d766f]">请求接口</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#101814]">JSON</p>
              <p className="mt-1 text-xs font-medium text-[#6d766f]">原始输出</p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="flex flex-col rounded-lg border border-[#d9ded4] bg-white/80 shadow-[0_18px_50px_rgba(30,42,35,0.08)]">
            <div className="border-b border-[#e3e7df] px-5 py-4">
              <p className="text-sm font-semibold text-[#101814]">需求输入</p>
              <p className="mt-1 text-sm text-[#6d766f]">
                适合单条用户故事、规则描述或接口需求。
              </p>
            </div>

            <form className="flex flex-1 flex-col gap-5 p-5" onSubmit={handleSubmit}>
              <label className="grid flex-1 gap-3">
                <span className="text-sm font-medium text-[#37423b]">原始需求</span>
                <textarea
                  rows={10}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="min-h-56 w-full resize-none rounded-lg border border-[#cfd6cd] bg-[#fbfcf8] px-4 py-3 text-base leading-7 text-[#17201b] outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/10"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {EXAMPLE_REQUIREMENTS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setInput(example)}
                    className="rounded-lg border border-[#d9ded4] bg-[#f7f8f3] px-3 py-2 text-left text-sm text-[#55615a] transition hover:border-[#0f766e]/40 hover:bg-[#eef7f4] hover:text-[#0f766e]"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#7a837d]">
                  {input.trim().length} 字符，提交后会覆盖当前结果。
                </p>
                <button
                  type="submit"
                  disabled={loading || input.trim().length === 0}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0f766e] px-5 text-sm font-semibold text-white transition hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:bg-[#aeb8b2]"
                >
                  {loading ? "抽取中..." : "开始抽取"}
                </button>
              </div>

              {error ? (
                <p className="rounded-lg border border-[#f0b9a8] bg-[#fff4ef] px-4 py-3 text-sm font-medium text-[#9a3412]">
                  {error}
                </p>
              ) : null}
            </form>
          </section>

          <section className="flex min-h-[560px] flex-col rounded-lg border border-[#26332c] bg-[#101814] text-white shadow-[0_18px_50px_rgba(16,24,20,0.18)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold">抽取结果</p>
                <p className="mt-1 text-sm text-white/55">
                  结构化字段会在请求成功后显示。
                </p>
              </div>
              <span className="rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-white/65">
                {loading ? "运行中" : result ? "已完成" : "待提交"}
              </span>
            </div>

            <div className="grid flex-1 gap-5 p-5">
              <div className="grid gap-3">
                {resultSections.map(({ key, title, description }) => {
                  const value = result?.[key];
                  const items = Array.isArray(value)
                    ? value
                    : value
                      ? [value]
                      : [];

                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#2dd4bf]/40"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-base font-semibold text-white">{title}</h2>
                          <p className="mt-1 text-sm text-white/50">{description}</p>
                        </div>
                        <span className="mt-2 w-fit rounded-lg bg-[#2dd4bf]/10 px-2.5 py-1 text-xs font-medium text-[#7dded4] sm:mt-0">
                          {items.length || 0}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2">
                        {items.length > 0 ? (
                          items.map((item) => (
                            <p
                              key={`${key}-${item}`}
                              className="rounded-lg bg-white/[0.07] px-3 py-2 text-sm leading-6 text-white/[0.86]"
                            >
                              {item}
                            </p>
                          ))
                        ) : (
                          <p className="rounded-lg border border-dashed border-white/[0.12] px-3 py-2 text-sm text-white/[0.38]">
                            暂无内容
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border border-white/10 bg-black/[0.24]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <h2 className="text-sm font-semibold text-white">原始 JSON</h2>
                  <span className="text-xs text-white/[0.38]">readonly</span>
                </div>
                <pre className="min-h-36 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-sm leading-6 text-[#c7f6ee]">
                  {result ? JSON.stringify(result, null, 2) : "// 等待抽取结果"}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
