import express from 'express';
import path from 'path';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini AI Client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada nas variáveis de ambiente.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Route: Suggest Smart WhatsApp Reply using Gemini 3.6 Flash
  app.post('/api/ai/suggest-reply', async (req, res) => {
    try {
      const { chatHistory, contactName, goal, tone } = req.body;
      const ai = getGeminiClient();

      const prompt = `Você é um assistente especialista em vendas e atendimento pelo WhatsApp CRM (WACRM).
Você está sugerindo uma resposta rápida para o atendente enviar ao cliente "${contactName || 'Cliente'}".

Histórico de Mensagens Recentes:
${chatHistory || 'Nenhum histórico fornecido.'}

Objetivo do Atendente: ${goal || 'Dar prosseguimento na conversa de forma cordial e objetiva'}
Tom de Voz Desejado: ${tone || 'Profissional, amigável e focado em conversão'}

Regras de Resposta:
1. Escreva a mensagem em Português do Brasil de forma direta e natural para o WhatsApp.
2. Use quebras de linha curtas e emojis moderados.
3. Não insira saudações repetitivas se o cliente já estiver conversando.
4. Foque em mover o cliente para a próxima etapa do funil (fechamento, agendamento, envio de orçamento).
5. Forneça APENAS o texto da sugestão de mensagem de forma limpa sem aspas nem explicações extras.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });

      res.json({ suggestion: response.text ? response.text.trim() : '' });
    } catch (err: any) {
      console.error('Error in /api/ai/suggest-reply:', err);
      res.status(500).json({
        error: 'Erro ao gerar sugestão com IA.',
        details: err?.message || String(err),
      });
    }
  });

  // API Route: Summarize Customer Conversation & Extract Lead Status
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { chatHistory, contactName } = req.body;
      const ai = getGeminiClient();

      const prompt = `Analise a seguinte conversa do WhatsApp CRM com o cliente "${contactName || 'Cliente'}":

Conversa:
${chatHistory || ''}

Gere um resumo executivo com os seguintes itens em formato JSON legível:
1. "resumo": Resumo em 2-3 frases das principais necessidades/dúvidas do cliente.
2. "sentimento": "Positivo", "Neutro", "Interessado", "Insatisfeito" ou "Dúvida Comercial".
3. "proximosPassos": Lista de 2 ações recomendadas para o atendente.
4. "temperaturaLead": "Quente", "Morno" ou "Frio".`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      let data = {};
      try {
        data = JSON.parse(response.text || '{}');
      } catch (e) {
        data = { resumo: response.text || '' };
      }

      res.json(data);
    } catch (err: any) {
      console.error('Error in /api/ai/summarize:', err);
      res.status(500).json({
        error: 'Erro ao gerar resumo com IA.',
        details: err?.message || String(err),
      });
    }
  });

  // API Route: AI Auto-Responder Bot Simulation
  app.post('/api/ai/auto-bot', async (req, res) => {
    try {
      const { userMessage, contactName, companyRules } = req.body;
      const ai = getGeminiClient();

      const prompt = `Você é o Chatbot de IA oficial do WACRM atendendo no WhatsApp o cliente "${contactName || 'Cliente'}".

Instruções da Empresa:
${companyRules || 'Atenda o cliente tirando dúvidas sobre o CRM, conexões com WhatsApp, valores de planos e agendamento de reuniões.'}

Mensagem do Cliente:
"${userMessage}"

Responda em Português do Brasil de forma extremamente cordial, curta e útil para WhatsApp. Se necessário, pergunte se ele quer falar com um atendente humano.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });

      res.json({ reply: response.text ? response.text.trim() : 'Olá! Como posso te ajudar hoje?' });
    } catch (err: any) {
      console.error('Error in /api/ai/auto-bot:', err);
      res.status(500).json({
        error: 'Erro ao processar resposta automática de IA.',
        details: err?.message || String(err),
      });
    }
  });

  // API Route: Generate Broadcast Campaign Copy
  app.post('/api/ai/generate-campaign', async (req, res) => {
    try {
      const { campaignType, targetAudience, offerDetails } = req.body;
      const ai = getGeminiClient();

      const prompt = `Escreva 2 variações de mensagens persuasivas para disparo em massa no WhatsApp CRM (Broadcast).

Tipo da Campanha: ${campaignType || 'Promoção / Vendas'}
Público Alvo: ${targetAudience || 'Clientes cadastrados'}
Detalhes / Oferta: ${offerDetails || 'Desconto exclusivo esta semana'}

Regras:
1. Use a variável {{nome}} no texto para personalização.
2. Formate com negritos no WhatsApp (*texto*), emojis e chamadas para ação (CTA) claras.
3. Retorne em formato JSON: { "variacaoA": "...", "variacaoB": "..." }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      let data = {};
      try {
        data = JSON.parse(response.text || '{}');
      } catch (e) {
        data = { variacaoA: response.text || '' };
      }

      res.json(data);
    } catch (err: any) {
      console.error('Error in /api/ai/generate-campaign:', err);
      res.status(500).json({
        error: 'Erro ao gerar cópias de disparo.',
        details: err?.message || String(err),
      });
    }
  });

  // API Route: Test Gemini API Key Connection
  app.post('/api/ai/test-key', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          ok: false,
          error: 'Chave GEMINI_API_KEY não configurada no ambiente.',
        });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: 'Diga "Gemini 3.6 Flash Ativo no WACRM!" em uma frase motivacional curta.',
      });

      res.json({
        ok: true,
        model: 'gemini-3.6-flash',
        message: response.text ? response.text.trim() : 'Conexão estabelecida com sucesso!',
        apiKeyMasked: `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`,
      });
    } catch (err: any) {
      console.error('Error in /api/ai/test-key:', err);
      res.status(500).json({
        ok: false,
        error: 'Falha na autenticação ou chamada da API Gemini.',
        details: err?.message || String(err),
      });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'WACRM - WhatsApp CRM', timestamp: new Date() });
  });

  // Serve Vite in development or static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server WACRM running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
