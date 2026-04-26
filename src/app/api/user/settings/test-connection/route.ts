import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createProvider } from "@/lib/ai";
import { ProviderError } from "@/lib/ai";
import type { ProviderCredentials } from "@/lib/ai";

interface TestConnectionBody {
  provider: string;
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TestConnectionBody;
  try {
    body = (await request.json()) as TestConnectionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let credentials: ProviderCredentials;

  // Input length validation
  const MAX_KEY_LEN = 256;
  const MAX_URL_LEN = 512;
  if (body.apiKey && body.apiKey.length > MAX_KEY_LEN) {
    return NextResponse.json({ error: "API key is too long." }, { status: 400 });
  }
  if (body.endpoint && body.endpoint.length > MAX_URL_LEN) {
    return NextResponse.json({ error: "Endpoint URL is too long." }, { status: 400 });
  }
  if (body.deployment && body.deployment.length > MAX_KEY_LEN) {
    return NextResponse.json({ error: "Deployment name is too long." }, { status: 400 });
  }

  switch (body.provider) {
    case "gemini":
      if (!body.apiKey) {
        return NextResponse.json({ error: "API key is required." }, { status: 400 });
      }
      credentials = { provider: "gemini", apiKey: body.apiKey };
      break;

    case "azure":
      if (!body.apiKey || !body.endpoint || !body.deployment) {
        return NextResponse.json(
          { error: "API key, endpoint, and deployment name are all required." },
          { status: 400 },
        );
      }
      credentials = {
        provider: "azure",
        apiKey: body.apiKey,
        endpoint: body.endpoint,
        deployment: body.deployment,
      };
      break;

    default:
      return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const provider = createProvider(credentials);
    await provider.testConnection(controller.signal);

    clearTimeout(timeout);
    return NextResponse.json({ success: true, provider: body.provider });
  } catch (err) {
    if (err instanceof ProviderError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode ?? 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Connection test failed." },
      { status: 500 },
    );
  }
}
