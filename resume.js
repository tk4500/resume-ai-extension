document.addEventListener('DOMContentLoaded', () => {
  
  // Busca o currículo formatado no banco de dados da extensão
  chrome.storage.local.get(['tailoredResume'], (data) => {
    if (!data.tailoredResume) {
      document.getElementById('resume-content').innerHTML = "<h2>Erro: Nenhum dado de currículo encontrado. Volte e gere novamente.</h2>";
      return;
    }

    const resume = data.tailoredResume;

    document.getElementById('r-title').textContent = resume.informacoes_pessoais.nome + " - " + resume.main_stack;
    // 1. Informações Pessoais
    document.getElementById('r-name').textContent = resume.informacoes_pessoais.nome;
    console.log(resume);
    // Monta a linha de contato dinamicamente (ignorando os "Não informado")
    const contacts = [];
    const info = resume.informacoes_pessoais;
    if (info.email && !info.email.toLowerCase().includes('não informado')) contacts.push(`📧 ${info.email}`);
    if (info.telefone && !info.telefone.toLowerCase().includes('não informado')) contacts.push(`📱 ${info.telefone}`);
    if (info.linkedin && !info.linkedin.toLowerCase().includes('não informado')) contacts.push(`🔗 ${info.linkedin.replace('https://', '')}`);
    if (info.github && !info.github.toLowerCase().includes('não informado')) contacts.push(`💻 ${info.github.replace('https://', '')}`);
    
    document.getElementById('r-contact').innerHTML = contacts.map(c => `<span>${c}</span>`).join(' | ');

    // 2. Resumo Profissional
    if (resume.language === 'Inglês (EN-US)') {
        document.getElementById('r-summary-title').textContent = "Professional Summary";
        document.getElementById('r-skills-title').textContent = "Technical Skills";
        document.getElementById('r-experience-title').textContent = "Professional Experience";
        document.getElementById('r-education-title').textContent = "Education";
    }
    document.getElementById('r-summary').textContent = resume.resumo_profissional;

    // 3. Competências (Skills Pool)
    document.getElementById('r-skills').innerHTML = `<strong>Tecnologias e Habilidades:</strong> ${resume.skills_pool.join(', ')}`;

    // 4. Experiência Profissional
    const expContainer = document.getElementById('r-experience');
    expContainer.innerHTML = ''; // Limpa o container
    resume.experiencias.forEach(exp => {
      const div = document.createElement('div');
      
      // Converte o texto corrido (ou array de bullets, se a IA errar e mandar array) em HTML
      let formattedDescription = exp.descricao_original;
      if (Array.isArray(formattedDescription)) {
        formattedDescription = `<ul>${formattedDescription.map(item => `<li>${item}</li>`).join('')}</ul>`;
      } else {
        // Se for texto, tenta manter as quebras de linha ou hifens como lista
        formattedDescription = exp.descricao_original.replace(/\n/g, '<br>');
      }

      div.innerHTML = `
        <div class="item-header">
          <span>${exp.cargo}</span>
          <span>${exp.periodo}</span>
        </div>
        <div class="item-sub">${exp.empresa}</div>
        <div class="item-body">${formattedDescription}</div>
      `;
      expContainer.appendChild(div);
    });

    // 5. Formação Acadêmica
    const eduContainer = document.getElementById('r-education');
    eduContainer.innerHTML = ''; // Limpa o container
    resume.educacao.forEach(edu => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="item-header">
          <span>${edu.curso}</span>
          <span>${edu.periodo}</span>
        </div>
        <div class="item-sub">${edu.instituicao} - ${edu.nivel}</div>
        <div style="margin-bottom: 12px;"></div>
      `;
      eduContainer.appendChild(div);
    });

    // 6. O Grand Finale: Aciona a impressão automaticamente após renderizar
    // Um pequeno delay de 500ms garante que as fontes e o CSS foram carregados
    setTimeout(() => {
      window.print();
    }, 500);

  });
});

document.addEventListener('click', (e) => {
  if (e.target.id === 'download-btn') {
    // Aciona a impressão manualmente
    window.print();
  }
});