// Configura o worker do PDF.js (necessário para performance)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

document.getElementById('saveBtn').addEventListener('click', async () => {
  const apiKeysInput = document.getElementById('apiKeys').value;
  const fileInput = document.getElementById('resumePdf');
  const statusDiv = document.getElementById('status');
  const preview = document.getElementById('extractedTextPreview');

  // 1. Processar as chaves de API
  const apiKeys = apiKeysInput.split(',').map(key => key.trim()).filter(key => key.length > 0);
  
  if (apiKeys.length === 0) {
    statusDiv.style.color = 'red';
    statusDiv.textContent = 'Erro: Insira pelo menos uma chave de API.';
    return;
  }

  statusDiv.style.color = 'blue';
  statusDiv.textContent = 'Processando...';

  // 2. Extrair texto do PDF (se um arquivo foi selecionado)
  let extractedText = "";
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    try {
      extractedText = await extractTextFromPDF(file);
      preview.value = extractedText;
    } catch (error) {
      statusDiv.style.color = 'red';
      statusDiv.textContent = 'Erro ao ler o PDF: ' + error.message;
      return;
    }
  }

  // 3. Salvar no Storage da Extensão
  chrome.storage.local.set({ 
    apiKeys: apiKeys,
    currentKeyIndex: 0, // Inicia o ponteiro de rotação de chaves no 0
    rawResumeText: extractedText 
  }, () => {
    statusDiv.style.color = 'green';
    statusDiv.textContent = 'Configurações e texto salvos com sucesso!';
  });
});

// Função auxiliar para ler o PDF
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

// Carregar dados salvos ao abrir a página
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiKeys', 'rawResumeText'], (result) => {
    if (result.apiKeys) {
      document.getElementById('apiKeys').value = result.apiKeys.join(', ');
    }
    if (result.rawResumeText) {
      document.getElementById('extractedTextPreview').value = result.rawResumeText;
    }
  });
});

document.getElementById('generateJsonBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  const jsonPreview = document.getElementById('masterJsonPreview');
  
  statusDiv.style.color = 'blue';
  statusDiv.textContent = 'Chamando Gemini (3.1 Flash Lite) com esquema estrito... Isso pode levar alguns segundos.';

  chrome.storage.local.get(['apiKeys', 'rawResumeText'], async (data) => {
    if (!data.apiKeys || data.apiKeys.length === 0) {
      statusDiv.textContent = 'Erro: Nenhuma chave de API configurada.';
      return;
    }
    if (!data.rawResumeText) {
      statusDiv.textContent = 'Erro: Faça o upload e extraia o texto do PDF primeiro.';
      return;
    }

    const rawText = data.rawResumeText;

    // O Payload exato que você construiu
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{
            text: "Você é um assistente de extração de dados. \nAnalise o texto do currículo abaixo e extraia as informações estritamente no formato JSON fornecido.\n\nTexto do currículo:\n" + rawText // Injeta o texto real extraído do PDF atual
          }]
        }
      ],
      generationConfig: {
        thinkingConfig: { thinkingLevel: "MINIMAL" },
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            informacoes_pessoais: {
              type: "object",
              properties: {
                nome: { type: "string" },
                email: { type: "string" },
                telefone: { type: "string" },
                linkedin: { type: "string" },
                github: { type: "string" }
              },
              required: ["telefone", "linkedin", "github"],
              propertyOrdering: ["nome", "email", "telefone", "linkedin", "github"]
            },
            resumo_profissional: { type: "string" },
            skills_pool: { type: "array", items: { type: "string" } },
            experiencias: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  empresa: { type: "string" },
                  cargo: { type: "string" },
                  periodo: { type: "string" },
                  descricao_original: { type: "string" }
                },
                propertyOrdering: ["empresa", "cargo", "periodo", "descricao_original"]
              }
            },
            educacao: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  instituicao: { type: "string" },
                  curso: { type: "string" },
                  nivel: { type: "string" },
                  periodo: { type: "string" }
                },
                propertyOrdering: ["instituicao", "curso", "nivel", "periodo"]
              }
            }
          },
          propertyOrdering: ["informacoes_pessoais", "resumo_profissional", "skills_pool", "experiencias", "educacao"]
        }
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    try {

      const result = await fetchWithKeyRotation(payload, data.apiKeys, "gemini-3.1-flash-lite-preview");
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Como forçamos o responseMimeType, o retorno JÁ É uma string de JSON válido
      const cleanJsonText = result.candidates[0].content.parts[0].text;
      const masterJson = JSON.parse(cleanJsonText);

      // Salva o JSON estruturado no Storage
      chrome.storage.local.set({ masterJson: masterJson }, () => {
        jsonPreview.value = JSON.stringify(masterJson, null, 2);
        statusDiv.style.color = 'green';
        statusDiv.textContent = 'Master JSON gerado e salvo com sucesso!';
      });

    } catch (error) {
      statusDiv.style.color = 'red';
      statusDiv.textContent = 'Erro ao processar com a IA: ' + error.message;
      console.error(error);
    }
  });
});

// Atualize o listener do DOMContentLoaded para carregar o JSON salvo ao abrir a página
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiKeys', 'rawResumeText', 'masterJson'], (result) => {
    if (result.apiKeys) document.getElementById('apiKeys').value = result.apiKeys.join(', ');
    if (result.rawResumeText) document.getElementById('extractedTextPreview').value = result.rawResumeText;
    // Nova linha:
    if (result.masterJson) document.getElementById('masterJsonPreview').value = JSON.stringify(result.masterJson, null, 2);
  });
});

// ... (mantenha todo o código existente do options.js aqui em cima) ...

// Nova Lógica: Salvar o JSON editado manualmente
document.getElementById('saveEditedJsonBtn').addEventListener('click', () => {
  const jsonString = document.getElementById('masterJsonPreview').value;
  const statusDiv = document.getElementById('status');
  
  try {
    // Tenta converter o texto editado de volta para um objeto JavaScript
    // Isso serve como validação. Se tiver erro de sintaxe, vai cair no catch
    const editedJson = JSON.parse(jsonString);
    
    // Salva no storage
    chrome.storage.local.set({ masterJson: editedJson }, () => {
      statusDiv.style.color = 'green';
      statusDiv.textContent = 'Edições do JSON salvas com sucesso!';
    });
  } catch (error) {
    statusDiv.style.color = 'red';
    statusDiv.textContent = 'Erro no JSON: Verifique vírgulas, colchetes e aspas.';
    console.error("Erro de Parse do JSON:", error);
  }
});

// --- PARTE 3: LÓGICA DE GERAÇÃO PARA A VAGA ---

// Função que será executada DENTRO da página do LinkedIn
function scrapeLinkedInJob() {
  // Tenta encontrar o título da vaga
  const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title') || document.querySelector('h1');
  const title = titleEl ? titleEl.innerText.trim() : 'Vaga Desconhecida';

  // Tenta encontrar a descrição da vaga (O LinkedIn muda as classes, então tentamos várias)
  const descEl = document.querySelector('#job-details') || document.querySelector('.jobs-description__content') || document.querySelector('.show-more-less-html__markup') || document.querySelector('article');
  const description = descEl ? descEl.innerText.trim() : '';

  return { title, description };
}

document.getElementById('captureAndGenerateBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('generatorStatus');
  const language = document.getElementById('languageSelect').value;
  
  statusDiv.textContent = 'Lendo a vaga no LinkedIn...';
  statusDiv.style.color = '#4338ca';

  // 1. Injetar script na aba ativa
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes("linkedin.com/jobs")) {
    statusDiv.textContent = 'Erro: Você precisa estar na página de uma vaga no LinkedIn.';
    statusDiv.style.color = 'red';
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapeLinkedInJob,
  }, async (injectionResults) => {
    
    const jobData = injectionResults[0].result;
    
    if (!jobData.description) {
      statusDiv.textContent = 'Erro: Não foi possível ler a descrição da vaga na página.';
      statusDiv.style.color = 'red';
      return;
    }

    statusDiv.textContent = 'Vaga capturada! Ajustando currículo com a IA...';

    // 2. Recuperar as chaves e o Master JSON
    chrome.storage.local.get(['apiKeys', 'masterJson'], async (data) => {
      if (!data.apiKeys || data.apiKeys.length === 0) {
        statusDiv.textContent = 'Erro: Configure a chave de API primeiro.'; return;
      }
      if (!data.masterJson) {
        statusDiv.textContent = 'Erro: Gere seu Master JSON no setup primeiro.'; return;
      }

      // 3. O Prompt de Tailoring e Gap-Filling
      const promptText = `
        Você é um Tech Recruiter Especialista e Resume Writer.
        Seu objetivo é pegar o 'Master JSON' do candidato e criar um novo JSON perfeitamente adaptado para a vaga abaixo.
        
        VAGA: ${jobData.title}
        DESCRIÇÃO DA VAGA:
        ${jobData.description}

        MASTER JSON DO CANDIDATO:
        ${JSON.stringify(data.masterJson)}

        REGRAS ESTRITAS:
        1. IDIOMA: Todo o conteúdo do currículo final (resumo, cargos, descrições) DEVE ser traduzido e gerado em ${language}.
        2. SKILLS POOL: Filtre a lista original e mantenha apenas as 10-15 skills mais relevantes para esta vaga específica. Pode incluir soft-skills deduzidas se necessário.
        3. RESUMO PROFISSIONAL: Reescreva o resumo para alinhar fortemente os objetivos do candidato com as necessidades da vaga.
        4. EXPERIÊNCIAS (TAILORING): Reescreva os 'bullet points' de cada experiência original. Destaque as tecnologias e vivências que dão "match" com a vaga. Use verbos de ação fortes. Não invente cargos ou empresas.
        5. PREENCHIMENTO DE LACUNAS (GAP-FILLING): Analise os períodos das experiências. Se houver lacunas maiores que 3 meses, crie entradas chamadas "Consultor de Tecnologia Independente" ou "Desenvolvedor Freelancer". 
           - REGRA DE OURO PARA FREELANCE: Você DEVE utilizar APENAS e EXCLUSIVAMENTE as tecnologias que já existem na lista original do candidato ('skills_pool'). 
           - NUNCA, sob nenhuma hipótese, adicione ou mencione uma stack/linguagem que o candidato não possua, mesmo que a vaga atual exija. 
           - Se a vaga pedir algo que ele não sabe, foque em descrever como as ferramentas que ele JÁ DOMINA (ex: Python, JavaScript, etc.) foram usadas para resolver problemas de lógica, arquitetura ou automação para clientes. Mantenha a honestidade técnica.
           - Hoje é ${new Date().toLocaleDateString('pt-BR')}, então use isso como referência para calcular os gaps. (caso tenha algum gap que precise ser preenchido, claro)
        6. MAIN STACK: Identifique a "main stack" do candidato com base nas experiências e skills listadas. a Main Stack vai servir para o titulo do currículo e para destacar as tecnologias mais importantes. Se a vaga tiver uma stack específica, tente alinhar a main stack do candidato com ela, se fizer sentido. 
        Retorne ESTRITAMENTE o JSON estruturado.
      `;

      // O payload usa o mesmo Schema da Parte 2 para garantir consistência
      const payload = {
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.4, // Temperatura um pouco maior para permitir a "criatividade" nos gaps e nas reescritas
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              informacoes_pessoais: {
                type: "object",
                properties: { nome: { type: "string" }, email: { type: "string" }, telefone: { type: "string" }, linkedin: { type: "string" }, github: { type: "string" } }
              },
              main_stack: { type: "string" },
              resumo_profissional: { type: "string" },
              skills_pool: { type: "array", items: { type: "string" } },
              experiencias: {
                type: "array",
                items: {
                  type: "object",
                  properties: { empresa: { type: "string" }, cargo: { type: "string" }, periodo: { type: "string" }, descricao_original: { type: "string" } }
                }
              },
              educacao: {
                type: "array",
                items: {
                  type: "object",
                  properties: { instituicao: { type: "string" }, curso: { type: "string" }, nivel: { type: "string" }, periodo: { type: "string" } }
                }
              }
            }
          }
        }
      };

      try {
        const result = await fetchWithKeyRotation(payload, data.apiKeys, "gemini-3-flash-preview");

        const cleanJsonText = result.candidates[0].content.parts[0].text;
        let tailoredResumeData = JSON.parse(cleanJsonText);
        tailoredResumeData.language = language; // Anexa o idioma escolhido para referência futura (opcional)



        // Salva o currículo finalizado temporariamente no Storage
        chrome.storage.local.set({ tailoredResume: tailoredResumeData }, () => {
          statusDiv.style.color = 'green';
          statusDiv.textContent = 'Currículo moldado com sucesso! (Pronto para gerar PDF)';
          console.log("Currículo Final:", tailoredResumeData);
        chrome.tabs.create({ url: chrome.runtime.getURL("resume.html") });
          // AQUI VAI ENTRAR A CHAMADA PARA ABRIR A ABA DE IMPRESSÃO (PARTE 4)
        });

      } catch (error) {
        statusDiv.style.color = 'red';
        statusDiv.textContent = 'Erro ao processar Vaga: ' + error.message;
        console.error(error);
      }
    });
  });

});

// Função inteligente que tenta todas as chaves disponíveis antes de desistir
async function fetchWithKeyRotation(payload, apiKeys, MODEL_ID) {

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i].trim();
    if (!apiKey) continue;

    console.log(`Tentando chave ${i + 1} de ${apiKeys.length}...`);
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.error) {
        // Se o erro for de Cota/Rate Limit (429) ou erro genérico de limite
        if (response.status === 429 || result.error.message.toLowerCase().includes('quota') || result.error.message.toLowerCase().includes('exceeded')) {
          console.warn(`⚠️ Chave ${i + 1} esgotada ou bloqueada. Pulando para a próxima...`);
          continue; // Pula para a próxima repetição do loop (próxima chave)
        } else {
          // Se for um erro de sintaxe do JSON ou algo do tipo, joga o erro para fora
          throw new Error(result.error.message);
        }
      }

      // Se passou pelos testes acima, a requisição foi um sucesso!
      console.log(`✅ Sucesso usando a chave ${i + 1}!`);
      return result;

    } catch (error) {
      // Se for a última chave do array e der erro de rede, repassa o erro
      if (i === apiKeys.length - 1) {
        throw new Error("Todas as chaves de API falharam ou estão sem cota. Verifique seus limites.");
      }
      console.warn(`Erro de rede na chave ${i + 1}. Tentando próxima...`);
    }
  }
}