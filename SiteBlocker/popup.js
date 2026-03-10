document.addEventListener('DOMContentLoaded', () => {
  const siteInput = document.getElementById('siteInput');
  const addBtn = document.getElementById('addBtn');
  const blockedList = document.getElementById('blockedList');

  // Sayfa yüklendiğinde mevcut siteleri getir
  renderList();

  // Ekleme butonu tıklama olayı
  addBtn.addEventListener('click', addSite);

  // Enter tuşu ile ekleme desteği
  siteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
  });

  // Silme işlemi için Event Delegation (Liste üzerindeki tıklamaları dinle)
  blockedList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const siteToRemove = e.target.getAttribute('data-site');
      removeSite(siteToRemove);
    }
  });

  // URL'den sadece domain kısmını temizleyen yardımcı fonksiyon
  function extractDomain(input) {
    let domain = input.trim().toLowerCase();
    // Eğer kullanıcı http/https veya www ile girdiyse temizle
    domain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    return domain;
  }

  function addSite() {
    const rawInput = siteInput.value;
    if (!rawInput) return;

    const domain = extractDomain(rawInput);
    if (domain === "") return;

    chrome.storage.local.get(['blockedSites'], (result) => {
      let sites = result.blockedSites || [];
      
      // Site zaten listede varsa ekleme
      if (!sites.includes(domain)) {
        sites.push(domain);
        chrome.storage.local.set({ blockedSites: sites }, () => {
          siteInput.value = '';
          renderList();
        });
      } else {
        siteInput.value = ''; // Zaten var, inputu temizle
      }
    });
  }

  function removeSite(domainToRemove) {
    chrome.storage.local.get(['blockedSites'], (result) => {
      let sites = result.blockedSites || [];
      sites = sites.filter(site => site !== domainToRemove);
      
      chrome.storage.local.set({ blockedSites: sites }, () => {
        renderList();
      });
    });
  }

  function renderList() {
    chrome.storage.local.get(['blockedSites'], (result) => {
      const sites = result.blockedSites || [];
      blockedList.innerHTML = ''; // Listeyi temizle

      if (sites.length === 0) {
        blockedList.innerHTML = '<li style="justify-content: center; color: #6b7280; border: none; box-shadow: none; background: transparent;">Liste şu an boş.</li>';
        return;
      }

      sites.forEach(site => {
        const li = document.createElement('li');
        
        const span = document.createElement('span');
        span.textContent = site;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Sil';
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('data-site', site);

        li.appendChild(span);
        li.appendChild(deleteBtn);
        blockedList.appendChild(li);
      });
    });
  }
});