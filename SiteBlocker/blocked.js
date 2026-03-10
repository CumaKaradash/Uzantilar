document.addEventListener('DOMContentLoaded', function() {
  const closeTabBtn = document.getElementById('closeTabBtn');
  
  if (closeTabBtn) {
    closeTabBtn.addEventListener('click', function(event) {
      event.preventDefault();
      window.close();
    });
  }
});
