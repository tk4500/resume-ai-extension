***
# 📄 NextRole - AI-Powered Resume Matcher

## 📌 Sobre o Projeto

**NextRole** é uma extensão para Google Chrome desenvolvida para automatizar e otimizar a criação de currículos focados em passar pelos filtros ATS (Applicant Tracking Systems) de plataformas como o LinkedIn. 

Adaptar um currículo para os requisitos específicos de cada vaga é essencial, porém extremamente exaustivo. Esta extensão resolve essa dor ao utilizar a Inteligência Artificial do Google Gemini para cruzar as informações do currículo base do usuário com a descrição da vaga, gerando um documento PDF totalmente otimizado, formatado e pronto para o envio.

## 🚀 Principais Funcionalidades

* **Extração de Texto in-browser:** Leitura e extração de dados de PDFs diretamente no navegador utilizando o worker do PDF.js, garantindo privacidade e velocidade sem precisar de um servidor backend para processar os arquivos.
* **Integração Nativa com IA (Google Gemini):** Comunicação direta via chamadas REST para a API do Gemini (generativelanguage.googleapis.com) para processamento de linguagem natural e estruturação de dados.
* **Resiliência e Tratamento de Limites (Rate Limits):** Sistema inteligente de rotatividade de chaves (API Keys). Se a IA estourar a cota gratuita (Erro 429) em uma chave, o sistema automaticamente pula para a próxima chave configurada, garantindo a entrega do resultado.
* **Geração Automática de Documentos:** Renderização dinâmica dos dados estruturados pela IA em um template HTML focado em impressão (A4, layout limpo), utilizando Media Queries (@media print) para salvar diretamente como PDF.

## 🛠️ Tecnologias e Arquitetura

Este projeto foi construído focando em leveza e performance, eliminando a necessidade de frameworks pesados no Frontend.

* **Ecossistema:** Chrome Extensions API (Manifest V3) com permissões isoladas de activeTab, scripting e storage.
* **Linguagens:** HTML5, CSS3, JavaScript (Vanilla ES6+).
* **Bibliotecas Externas:** pdf.js (Mozilla) para leitura de documentos client-side.
* **APIs:** Google Gemini API (v1beta).

## ⚙️ Como instalar e testar localmente

1. Clone o repositório:
   bash
   git clone [https://github.com/tk4500/resume-ai-extension.git](https://github.com/tk4500/resume-ai-extension.git)
   
2. Abra o Google Chrome e navegue até chrome://extensions/.
3. Ative o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação** (Load unpacked).
5. Selecione a pasta do projeto que você clonou.
6. Fixe a extensão na barra do navegador, insira suas chaves do Gemini no campo de setup e faça o upload do seu currículo base.

---
*Desenvolvido por [Tarcísio Bogo](https://github.com/tk4500)*

***
