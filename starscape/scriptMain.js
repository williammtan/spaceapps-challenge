const searchInput = document.getElementById('search-input');
const resultsPreview = document.getElementById('results-preview');

Papa.parse('exoplanets.csv', {
  download: true,
  header: true,
  complete: function(results) {
    const exoplanets = results.data;
    setupSearch(exoplanets);
  }
});

function setupSearch(exoplanets) {
  document.getElementById('search-input').addEventListener('input', function() {
    const query = searchInput.value.toLowerCase();
    const filteredPlanets = exoplanets.filter(planet => {
      return planet.pl_name && planet.pl_name.toLowerCase().includes(query);
    });
    resultsPreview.innerHTML = '';
    if (filteredPlanets.length > 0 && query) {
      filteredPlanets.slice(0, 10).forEach(planet => {
        const li = document.createElement('li');
        li.textContent = planet.pl_name;
        console.log(planet.pl_name);
        resultsPreview.appendChild(li);
      });
    }
  });
}

document.getElementById('search-btn').addEventListener('click', function(event) {
  const container = document.querySelector('.search-container');
  resultsPreview.innerHTML = '';
  container.classList.toggle('expanded');
  event.preventDefault();
});