'use strict';

var nots_list = qs('.notifications_list');

var load = () => {
  // init
}

var loadNewNotifications = () => {
  content.addEventListener('scroll', renderNewItems);

  let h = window.screen.height > nots_list.clientHeight,
      l = nots_list.clientHeight - window.outerHeight < window.scrollY;

  if(h || l) renderNewItems();
}

var renderNewItems = () => {
  let a = nots_list.parentNode.classList.contains('active'),
      h = window.screen.height > nots_list.clientHeight,
      l = nots_list.clientHeight - window.outerHeight < content.scrollTop;

  if(a && (h || l)) {
    content.removeEventListener('scroll', renderNewItems);
    getNotifications();
  }
}

module.exports = {
  load
}
