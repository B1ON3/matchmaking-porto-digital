import { createHash } from 'node:crypto';

export interface PrivacyPolicySection {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  items?: string[];
}

export interface PrivacyPolicy {
  version: string;
  effectiveAt: string;
  reviewDueAt: string;
  title: string;
  controller: string;
  contact: string;
  summary: string;
  sections: PrivacyPolicySection[];
}

const POLICY: PrivacyPolicy = {
  version: '1.0',
  effectiveAt: '2026-10-26',
  reviewDueAt: '2027-10-26',
  title: 'Política de Privacidade e Termos de Uso do Laço',
  controller: 'Laço — plataforma de matchmaking do Porto Digital',
  contact: 'privacidade@laco.app',
  summary:
    'O Laço conecta startups e investidores anjo. Esta política explica quais dados usamos, por quê, por quanto tempo e como você pode consultar, corrigir, exportar ou excluir suas informações.',
  sections: [
    {
      id: 'quem-somos',
      title: 'Quem somos e o que esta política cobre',
      summary: 'Controlador, escopo e relação com os termos de uso.',
      paragraphs: [
        'O Laço é uma plataforma acadêmica de matchmaking entre startups e investidores anjo do Porto Digital. Para os dados tratados na plataforma, o Laço atua como controlador e define as finalidades e os meios do tratamento.',
        'Esta política cobre o cadastro, o perfil, as conexões sugeridas, as mensagens, os agendamentos, os registros de auditoria e a central de privacidade. Ela vale para startups, investidores, mentores e administradores.',
        'Ao criar uma conta, você declara que leu estes termos e esta política. O aceite é registrado com versão, hash do documento, data, IP e navegador. Você pode consultar o recibo na Central de Privacidade.',
      ],
    },
    {
      id: 'termos-de-uso',
      title: 'Termos de uso da plataforma',
      summary: 'Regras de convivência, veracidade e limites do serviço.',
      paragraphs: [
        'Você deve fornecer informações verdadeiras, manter suas credenciais em segurança e usar a plataforma apenas para fins lícitos relacionados à conexão entre startups e investidores.',
        'É proibido assediar, discriminar, enviar spam, simular identidade, publicar conteúdo ilícito ou tentar acessar dados de outras contas. O descumprimento pode levar à suspensão ou ao encerramento da conta, com registro de auditoria.',
        'As sugestões de compatibilidade são apoio à decisão. Elas não constituem recomendação de investimento, due diligence, aconselhamento jurídico ou garantia de resultado.',
        'O serviço pode passar por manutenção, mudanças de escopo ou indisponibilidades. O Laço não se responsabiliza por negociações realizadas fora da plataforma.',
      ],
    },
    {
      id: 'dados-coletados',
      title: 'Dados que coletamos',
      summary: 'Dados de conta, perfil, uso, comunicação e segurança.',
      paragraphs: [
        'Coletamos apenas o necessário para operar a plataforma e cumprir obrigações legais. Você não é obrigado a fornecer dados opcionais, mas alguns deles são necessários para criar o perfil e calcular conexões.',
      ],
      items: [
        'Conta: nome, e-mail, senha armazenada como hash bcrypt, papel na plataforma, data de cadastro e último acesso.',
        'Startup: nome da empresa, setor, descrição, estágio, cidade, UF, site, pitch, necessidades e projetos cadastrados.',
        'Investidor: empresa, setores e estágios de interesse, faixa de ticket, cidade, UF e bio.',
        'Uso: conexões geradas, score e critérios do match, status da conexão, mensagens, reuniões e exportações solicitadas.',
        'Segurança: IP, navegador, data e ação em registros de auditoria, além de recibos de consentimento.',
        'Comunicações: sua escolha de receber ou não avisos e novidades. Esse consentimento é opcional e pode ser revogado a qualquer momento.',
      ],
    },
    {
      id: 'finalidades-bases',
      title: 'Finalidades e bases legais',
      summary: 'Por que tratamos cada grupo de dados e com qual fundamento.',
      paragraphs: [
        'Tratamos dados para executar o contrato de uso da plataforma, cumprir obrigações legais, prevenir fraudes e manter a segurança, atender solicitações do titular e, quando aplicável, com base no consentimento.',
      ],
      items: [
        'Cadastro e autenticação: execução de contrato e legítimo interesse em segurança.',
        'Perfil, matchmaking e contato entre participantes: execução de contrato e consentimento para dados opcionais.',
        'Mensagens e agendamentos: execução de contrato e legítimo interesse em oferecer o serviço.',
        'Auditoria, moderação e prevenção a abuso: legítimo interesse e cumprimento de obrigação legal.',
        'Comunicações de produto e novidades: consentimento, que pode ser revogado sem afetar o uso da conta.',
        'Exportação e exclusão: cumprimento de direitos do titular previstos na LGPD.',
      ],
    },
    {
      id: 'compartilhamento',
      title: 'Compartilhamento e operadores',
      summary: 'Quem pode acessar os dados e em quais situações.',
      paragraphs: [
        'Não vendemos dados pessoais. O acesso é limitado a quem precisa operar, moderar ou manter a plataforma.',
        'Provedores de hospedagem, banco de dados, e-mail transacional e observabilidade podem tratar dados como operadores, sob instruções e medidas de segurança compatíveis com esta política.',
        'Dados de perfil e mensagens podem ser vistos pelos participantes da conexão. Administradores acessam apenas o necessário para moderação, suporte e auditoria.',
        'Podemos divulgar informações por determinação legal, ordem judicial ou para proteger direitos, desde que respeitados os limites da lei.',
      ],
    },
    {
      id: 'retencao',
      title: 'Retenção e exclusão',
      summary: 'Prazos, anonimização e o que permanece após a exclusão.',
      paragraphs: [
        'Mantemos os dados enquanto a conta existir e pelo tempo necessário às finalidades informadas, ao exercício de direitos e ao cumprimento de obrigações legais.',
        'Ao solicitar a exclusão, apagamos ou anonimizamos dados de perfil, mensagens, agendamentos e vínculos sociais. Registros de auditoria permanecem sem vínculo direto com a pessoa, para segurança e prestação de contas.',
        'Recibos de consentimento podem ser preservados de forma vinculada à conta anonimizada para comprovar o cumprimento da LGPD. Eles não serão usados para contatar você.',
        'Backups seguem ciclos próprios de expiração e são restaurados apenas quando necessário, com a exclusão reaplicada.',
      ],
    },
    {
      id: 'direitos',
      title: 'Seus direitos como titular',
      summary: 'Consulta, correção, portabilidade, revogação e exclusão.',
      paragraphs: [
        'Você pode exercer os direitos previstos na LGPD pela Central de Privacidade ou pelo canal de contato. Responderemos em prazo razoável e poderemos confirmar sua identidade antes de atender pedidos sensíveis.',
      ],
      items: [
        'Confirmar a existência de tratamento e acessar seus dados.',
        'Corrigir dados incompletos, inexatos ou desatualizados.',
        'Solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.',
        'Solicitar portabilidade em formato estruturado, quando aplicável.',
        'Revogar o consentimento de comunicações e obter informações sobre as consequências.',
        'Opor-se a tratamentos baseados em legítimo interesse, com análise do pedido.',
        'Solicitar a exclusão da conta e dos dados pessoais associados.',
      ],
    },
    {
      id: 'seguranca',
      title: 'Como protegemos os dados',
      summary: 'Controle de acesso, criptografia e resposta a incidentes.',
      paragraphs: [
        'Usamos conexões TLS em produção, senhas com hash bcrypt, autorização por perfil, validação de entrada, limitação de tentativas e registros de auditoria sem conteúdo sensível em logs.',
        'Mensagens e descrições de reuniões são cifradas em repouso com AES-256-GCM e chaves versionadas. IP e navegador em auditoria recebem o mesmo tratamento.',
        'Em caso de incidente relevante, seguimos um plano de resposta com contenção, avaliação de risco, correção e comunicação às pessoas e autoridades quando exigido.',
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies, sessão e tecnologias semelhantes',
      summary: 'O que fica no navegador e como controlar.',
      paragraphs: [
        'Usamos armazenamento local para guardar o token de sessão e a preferência de tema. Não usamos cookies de publicidade nem rastreadores de terceiros para perfilamento comportamental.',
        'Você pode limpar o armazenamento do navegador a qualquer momento. Isso encerra a sessão e pode redefinir preferências visuais.',
      ],
    },
    {
      id: 'decisoes-automatizadas',
      title: 'Matchmaking e decisões automatizadas',
      summary: 'Como o score funciona e como pedir revisão.',
      paragraphs: [
        'O score de compatibilidade combina setor, estágio, ticket e região, com pesos explícitos. O resultado é uma sugestão de conexão, não uma decisão automática que produza efeitos jurídicos ou limite acesso a direitos.',
        'Você pode revisar e contestar sugestões pelo canal de privacidade. A equipe explica os critérios e corrige dados que estejam incorretos.',
      ],
    },
    {
      id: 'transferencia',
      title: 'Transferência internacional',
      summary: 'Onde os dados podem ser processados.',
      paragraphs: [
        'A infraestrutura pode usar provedores com servidores fora do Brasil. Nesses casos, buscamos garantias contratuais e medidas de segurança adequadas, nos termos da LGPD.',
        'Você pode solicitar informações sobre os países e os mecanismos de transferência aplicáveis pelo canal de contato.',
      ],
    },
    {
      id: 'alteracoes',
      title: 'Alterações e vigência',
      summary: 'Versionamento e novo aceite.',
      paragraphs: [
        'Mudanças relevantes geram nova versão e novo hash. Quando a alteração exigir seu aceite, a plataforma solicitará a confirmação antes de continuar o uso.',
        'A versão vigente, a data de vigência e o histórico de recibos ficam disponíveis na Central de Privacidade. A revisão desta política está prevista para ocorrer anualmente.',
      ],
    },
    {
      id: 'contato',
      title: 'Contato e encarregado de dados',
      summary: 'Canal para dúvidas, solicitações e reclamações.',
      paragraphs: [
        'Fale com o encarregado de dados pelo e-mail privacidade@laco.app. Descreva o pedido e o e-mail da conta para agilizar a análise.',
        'Se não ficar satisfeito, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).',
        'Este documento integra os Termos de Uso do Laço e foi redigido para o contexto acadêmico do projeto. A revisão por profissional jurídico é recomendada antes de uma operação comercial.',
      ],
    },
  ],
};

function canonicalText(policy: PrivacyPolicy): string {
  return [
    policy.version,
    policy.effectiveAt,
    policy.reviewDueAt,
    policy.title,
    policy.controller,
    policy.contact,
    policy.summary,
    ...policy.sections.flatMap((section) => [
      section.id,
      section.title,
      section.summary,
      ...section.paragraphs,
      ...(section.items ?? []),
    ]),
  ].join('\n');
}

export const PRIVACY_POLICY_HASH = createHash('sha256').update(canonicalText(POLICY)).digest('hex');

export function getPrivacyPolicy(): PrivacyPolicy & { hash: string } {
  return { ...POLICY, hash: PRIVACY_POLICY_HASH };
}
