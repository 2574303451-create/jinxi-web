'use strict';

const cards = document.querySelector('#cards');
const loadStatus = document.querySelector('#load');

function element(tag, label) {
  const node = document.createElement(tag);
  if (label) node.textContent = label;
  return node;
}

function nativeAction(cover, item, notice) {
  const button = element('button', '本站播放');
  button.type = 'button';
  button.addEventListener('click', () => {
    const video = element('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-label', item.title);
    video.tabIndex = 0;
    const fail = () => {
      if (!video.isConnected) return;
      video.remove();
      notice.textContent = '视频暂时无法播放，可以重试。';
      button.textContent = '重试本站播放';
      button.hidden = false;
      button.focus();
    };
    video.addEventListener('error', fail, { once: true });
    notice.textContent = '';
    button.hidden = true;
    cover.append(video);
    video.focus();
    video.src = item.playback.url;
    video.play().catch(fail);
  });
  return button;
}

function videoCard(item) {
  const card = element('article');
  card.setAttribute('aria-labelledby', `title-${item.id}`);
  const cover = element('div');
  cover.className = 'cover';
  const placeholder = element('span', '暂无封面');
  cover.append(placeholder);
  if (item.thumbnail) {
    const image = element('img');
    image.alt = '';
    image.addEventListener('load', () => { placeholder.hidden = true; }, { once: true });
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = item.thumbnail;
    cover.append(image);
  }
  const heading = element('h2', item.title);
  heading.id = `title-${item.id}`;
  card.append(cover, heading, element('p', item.description));
  const notice = element('div');
  notice.className = 'notice';
  notice.setAttribute('role', 'status');
  let action;
  if (item.playback?.mode === 'external') {
    action = element('a', '前往视频平台 ↗');
    action.href = item.playback.url;
    action.target = '_blank';
    action.rel = 'noopener noreferrer';
  } else if (item.playback?.mode === 'native') {
    action = nativeAction(cover, item, notice);
  } else {
    notice.textContent = '此附件当前不可播放。';
  }
  if (action) {
    action.className = 'action';
    card.append(action);
  }
  card.append(notice);
  return card;
}

async function loadCards() {
  try {
    const response = await fetch('/fixtures.json');
    if (!response.ok) throw Error('Demo fixtures unavailable');
    const items = await response.json();
    cards.append(...items.map(videoCard));
    loadStatus.hidden = true;
  } catch {
    loadStatus.textContent = '合成示例暂时无法读取，请刷新重试。';
  }
}
loadCards();
