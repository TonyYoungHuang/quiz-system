Component({
  data: {
    selected: 0,
    tabs: [
      {
        pagePath: '/pages/index/index',
        text: '\u9898\u5e93'
      },
      {
        pagePath: '/pages/activate/activate',
        text: '\u6fc0\u6d3b'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '\u6211\u7684'
      }
    ]
  },

  lifetimes: {
    attached() {
      this.syncSelected();
    }
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (!currentPage || !currentPage.route) return;
      const currentPath = `/${currentPage.route}`;
      const selected = this.data.tabs.findIndex((tab) => tab.pagePath === currentPath);
      if (selected >= 0) {
        this.setData({ selected });
      }
    },

    onSwitchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      if (!path || index === this.data.selected) return;
      wx.switchTab({ url: path });
    }
  }
});
