const TRANSLATIONS = {
  'zh-TW': { language: '語言', title: '🎮 遊戲角色美術咒語產生器', subtitle: '手遊 / Steam · 2D / 3D · 讀取外部 JSON 詞庫的角色設計提示詞工具', libraryTitle: '📂 素材詞庫矩陣', controlTitle: '🕹️ 主控面板', libraryHint: '點擊分類列可【展開/收合】。點選標籤可加入右側面板並可調整權重。', mobile: '📱 手機遊戲', steam: '🖥️ Steam / PC', general: '🎨 綜合風格', random: '🎲 指定分類隨機抽卡', clear: '❌ 清空重選', positive: '🚀 正向提示詞 (Positive)', negative: '❌ 反向排除詞 (Negative)', generators: '🖨️ 本機產圖工作台' },
  en: { language: 'Language', title: '🎮 Game Asset Prompt Generator', subtitle: 'Mobile / Steam · 2D / 3D · A character-design prompt tool powered by external JSON libraries', libraryTitle: '📂 Asset Prompt Library', controlTitle: '🕹️ Control Panel', libraryHint: 'Click a category to expand or collapse it. Select tags to add them to the prompt and adjust their weights.', mobile: '📱 Mobile Game', steam: '🖥️ Steam / PC', general: '🎨 General', random: '🎲 Randomize Selected Categories', clear: '❌ Clear Selection', positive: '🚀 Positive Prompt', negative: '❌ Negative Prompt', generators: '🖨️ Local Generation Studio' },
  ja: { language: '言語', title: '🎮 ゲームアセット・プロンプトジェネレーター', subtitle: 'モバイル / Steam ・ 2D / 3D ・ 外部 JSON 辞書を使ったキャラクターデザイン用ツール', libraryTitle: '📂 アセットプロンプト辞書', controlTitle: '🕹️ コントロールパネル', libraryHint: 'カテゴリをクリックすると開閉できます。タグを選択してプロンプトに追加し、重みを調整できます。', mobile: '📱 モバイルゲーム', steam: '🖥️ Steam / PC', general: '🎨 総合スタイル', random: '🎲 選択カテゴリをランダム抽選', clear: '❌ 選択をクリア', positive: '🚀 ポジティブプロンプト', negative: '❌ ネガティブプロンプト', generators: '🖨️ ローカル生成スタジオ' },
  ko: { language: '언어', title: '🎮 게임 에셋 프롬프트 생성기', subtitle: '모바일 / Steam · 2D / 3D · 외부 JSON 라이브러리를 사용하는 캐릭터 디자인 프롬프트 도구', libraryTitle: '📂 에셋 프롬프트 라이브러리', controlTitle: '🕹️ 제어 패널', libraryHint: '카테고리를 클릭해 펼치거나 접을 수 있습니다. 태그를 선택해 프롬프트에 추가하고 가중치를 조절하세요.', mobile: '📱 모바일 게임', steam: '🖥️ Steam / PC', general: '🎨 종합 스타일', random: '🎲 선택한 카테고리 무작위 추첨', clear: '❌ 선택 초기화', positive: '🚀 긍정 프롬프트', negative: '❌ 부정 프롬프트', generators: '🖨️ 로컬 생성 스튜디오' }
};
function translatePage(language) {
  const t = TRANSLATIONS[language] || TRANSLATIONS['zh-TW'];
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t[node.dataset.i18n] || node.textContent; });
  const set = (selector, text) => { const node = document.querySelector(selector); if (node) node.textContent = text; };
  set('.card > p', t.libraryHint); set('#btn-plat-mobile', t.mobile); set('#btn-plat-steam', t.steam); set('#btn-dim-general', t.general);
  set('button[onclick="randomPickSelected()"]', t.random); set('button[onclick="clearAllSelection()"]', t.clear);
  document.querySelectorAll('h4').forEach(node => { if (node.textContent.includes('Positive')) node.textContent = t.positive; if (node.textContent.includes('Negative')) node.textContent = t.negative; if (node.textContent.includes('工作台')) node.textContent = t.generators; });
  localStorage.setItem('language', language);
}
window.addEventListener('DOMContentLoaded', () => { const select = document.getElementById('language-select'); const language = localStorage.getItem('language') || navigator.language || 'zh-TW'; select.value = TRANSLATIONS[language] ? language : 'zh-TW'; translatePage(select.value); select.addEventListener('change', () => translatePage(select.value)); });
