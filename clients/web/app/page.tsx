"use client";

import { APP_NAME } from "@repo/contracts";
import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState<string>("");

  const onClick = async () => {
    const response = await fetch("/api/hello");
    const data = (await response.json()) as { message: string };
    setMessage(data.message);
  };

  return (
    <main>
      <h1>{`Hello from ${APP_NAME}`}</h1>
      <button type="button" onClick={onClick}>
        Call API
      </button>
      {message ? <p>{message}</p> : null}
    </main>
  );
}
