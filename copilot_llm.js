// Provides CopilotLLM and getCopilotTokenViaInternalEndpoint

const COPILOT_CHAT_URL = "https://api.business.githubcopilot.com/";

class CopilotLLM {
  constructor(token, model = "gpt-4.1", timeout = 60000) {
    if (!token) throw new Error("Copilot token is empty.");
    this.token = token;
    this.model = model;
    this.timeout = timeout;
  }

  _headers() {
    return {
      authorization: `Bearer ${this.token}`,
      "content-type": "application/json",
      "copilot-integration-id": "vscode-chat",
      "editor-plugin-version": "copilot-chat/0.32.1",
      "editor-version": "vscode/1.105.0",
      "openai-intent": "conversation-agent",
      "user-agent": "GitHubCopilotChat/0.32.1",
      "x-github-api-version": "2025-08-20",
    };
  }

  async invoke(messages, maxTokens = 8000, temperature = 2, tools = null) {
    const payload = {
      model: this.model,
      messages,
      temperature,
      top_p: 1,
      max_tokens: maxTokens,
      stream: false,
    };

    if (tools) payload.tools = tools;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(COPILOT_CHAT_URL, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Copilot API error: HTTP ${res.status} - ${txt.substring(0, 500)}`);
      }

      const data = await res.json();

      return data.choices?.[0]?.message?.content ?? JSON.stringify(data);
    } catch (err) {
      if (err.name === 'AbortError') throw new Error(`Request timeout after ${this.timeout}ms`);
      throw err;
    }
  }
}

async function getCopilotTokenViaInternalEndpoint(token, timeout = 30000, fallbackToGithubToken = true) {
  const url = "https://api.github.com/copilot_internal/v2/token";
  const headers = {
    authorization: `token ${token}`,
    "user-agent": "GitHubCopilotChat/0.32.1",
    "x-github-api-version": "2025-04-01",
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const tok = data.token;
    if (tok) {
      console.log(`Token acquired from GitHub API: ${tok.substring(0, 20)}...`);
      return tok;
    }
  } catch (err) {
    console.log(`Failed to get token from GitHub API: ${err.message}`);
    if (fallbackToGithubToken && token) {
      console.log(`Using GitHub token as fallback: ${token.substring(0,20)}...`);
      return token;
    }
  }

  console.log("No token available");
  return null;
}

module.exports = { CopilotLLM, getCopilotTokenViaInternalEndpoint };
