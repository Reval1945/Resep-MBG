// Initialize AOS (Animate on Scroll)
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100,
        easing: 'ease-out-cubic'
    });
    
    // Initialize ScrollSpy
    initScrollSpy();
    
    // Initialize all components
    initComponents();
    
    // Load recipes from API
    loadRecipes();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize parallax
    initParallax();
});

// API Configuration
const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1/';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const mobileSearchToggle = document.getElementById('mobileSearchToggle');
const searchSuggestions = document.querySelector('.search-suggestions-dropdown');
const suggestionLinks = document.querySelectorAll('.suggestion-link');

// Store recipes data
let recipesCache = {
    latest: [],
    popular: [],
    filtered: []
};

// Initialize ScrollSpy
function initScrollSpy() {
    const navbar = document.querySelector('#main-navbar');
    const navLinks = navbar.querySelectorAll('.nav-link');
    
    // Update active nav link on scroll
    function updateActiveNavLink() {
        const scrollPos = window.scrollY + 100;
        
        document.querySelectorAll('section[id]').forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    // Initial call
    updateActiveNavLink();
    
    // Update on scroll
    window.addEventListener('scroll', updateActiveNavLink);
    
    // Smooth scroll for nav links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize components
function initComponents() {
    // Initialize FAQ
    initializeFAQ();
    
    
    
    // Initialize loading overlay
    initLoadingOverlay();
}

// Initialize parallax effect
function initParallax() {
    const parallaxLayers = document.querySelectorAll('.parallax-layer');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        
        parallaxLayers.forEach(layer => {
            const speed = parseFloat(layer.getAttribute('data-speed'));
            const yPos = -(scrolled * speed);
            layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
        });
        
        // Update navbar on scroll
        const navbar = document.querySelector('.navbar');
        if (scrolled > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Initialize loading overlay
function initLoadingOverlay() {
    window.showLoading = function(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    };
}

// Load recipes from API
async function loadRecipes() {
    showLoading(true);
    
    try {
        // Load latest recipes
        await loadLatestRecipes();
        
        // Load popular recipes
        await loadPopularRecipes();
        
        // Load filtered recipes
        await loadFilteredRecipes('all');
    } catch (error) {
        console.error('Error loading recipes:', error);
        showErrorMessages();
    } finally {
        showLoading(false);
    }
}

// Load latest recipes
async function loadLatestRecipes() {
    try {
        // For latest recipes, search by first letter
        const response = await fetch(`${API_BASE_URL}search.php?f=b`);
        const data = await response.json();
        
        recipesCache.latest = data.meals ? data.meals.slice(0, 8) : getFallbackRecipes().slice(0, 8);
        displayRecipes(recipesCache.latest, '#latestRecipesContainer');
    } catch (error) {
        console.error('Error loading latest recipes:', error);
        recipesCache.latest = getFallbackRecipes().slice(0, 8);
        displayRecipes(recipesCache.latest, '#latestRecipesContainer');
    }
}

// Load popular recipes
async function loadPopularRecipes() {
    try {
        // Get 8 random meals for popular section
        const requests = Array(8).fill().map(() => 
            fetch(`${API_BASE_URL}random.php`).then(res => res.json())
        );
        
        const responses = await Promise.all(requests);
        recipesCache.popular = responses.map(response => response.meals[0]);
        
        // Filter out duplicates
        const uniqueIds = new Set();
        recipesCache.popular = recipesCache.popular.filter(recipe => {
            if (!recipe || uniqueIds.has(recipe.idMeal)) return false;
            uniqueIds.add(recipe.idMeal);
            return true;
        });
        
        if (recipesCache.popular.length === 0) {
            recipesCache.popular = getFallbackRecipes().slice(0, 8);
        }
        
        displayRecipes(recipesCache.popular, '#popularRecipesContainer');
    } catch (error) {
        console.error('Error loading popular recipes:', error);
        recipesCache.popular = getFallbackRecipes().slice(0, 8);
        displayRecipes(recipesCache.popular, '#popularRecipesContainer');
    }
}

// Load filtered recipes by category
async function loadFilteredRecipes(category) {
    try {
        let recipes = [];
        
        if (category === 'all') {
            // Get meals from multiple categories
            const categories = ['Chicken', 'Beef', 'Seafood', 'Vegetarian', 'Dessert', 'Pasta'];
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            
            const response = await fetch(`${API_BASE_URL}filter.php?c=${randomCategory}`);
            const data = await response.json();
            
            recipes = data.meals ? data.meals.slice(0, 9) : [];
            
            // Get details for each recipe
            if (recipes.length > 0) {
                const detailRequests = recipes.map(recipe => 
                    fetch(`${API_BASE_URL}lookup.php?i=${recipe.idMeal}`).then(res => res.json())
                );
                
                const detailResponses = await Promise.all(detailRequests);
                recipes = detailResponses.map(response => response.meals[0]);
            }
        } else {
            // Map our category names to API category names
            const categoryMap = {
                'chicken': 'Chicken',
                'beef': 'Beef',
                'seafood': 'Seafood',
                'vegetarian': 'Vegetarian',
                'dessert': 'Dessert',
                'pasta': 'Pasta',
                'breakfast': 'Breakfast'
            };
            
            const apiCategory = categoryMap[category] || category;
            const response = await fetch(`${API_BASE_URL}filter.php?c=${apiCategory}`);
            const data = await response.json();
            
            recipes = data.meals ? data.meals.slice(0, 9) : [];
            
            // Get details for each recipe
            if (recipes.length > 0) {
                const detailRequests = recipes.map(recipe => 
                    fetch(`${API_BASE_URL}lookup.php?i=${recipe.idMeal}`).then(res => res.json())
                );
                
                const detailResponses = await Promise.all(detailRequests);
                recipes = detailResponses.map(response => response.meals[0]);
            }
        }
        
        if (recipes.length === 0) {
            recipes = getFallbackRecipes().slice(0, 9);
        }
        
        recipesCache.filtered = recipes;
        displayRecipes(recipes, '#filteredRecipesContainer', true);
    } catch (error) {
        console.error('Error loading filtered recipes:', error);
        recipesCache.filtered = getFallbackRecipes().slice(0, 9);
        displayRecipes(recipesCache.filtered, '#filteredRecipesContainer', true);
    }
}

// Display recipes in container
function displayRecipes(recipes, containerSelector, showCategory = false) {
    const container = document.querySelector(containerSelector);
    
    if (!recipes || recipes.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center" data-aos="fade-up">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Tidak ada resep yang ditemukan.
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    recipes.forEach((recipe, index) => {
        const category = recipe.strCategory || 'International';
        const area = recipe.strArea || 'International';
        const instructions = recipe.strInstructions ? 
            recipe.strInstructions.substring(0, 120) + '...' : 
            'Instruksi tidak tersedia.';
        
        // Generate random rating
        const rating = (Math.random() * (5 - 3.5) + 3.5).toFixed(1);
        const stars = Math.floor(rating);
        
        let starsHtml = '';
        for (let i = 0; i < 5; i++) {
            if (i < stars) {
                starsHtml += '<i class="fas fa-star"></i>';
            } else {
                starsHtml += '<i class="far fa-star"></i>';
            }
        }
        
        html += `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4" data-aos="fade-up" data-aos-delay="${index * 100}">
                <div class="recipe-card">
                    <div class="recipe-img-container">
                        <img src="${recipe.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                             class="recipe-img" 
                             alt="${recipe.strMeal}">
                        <div class="recipe-badge">
                            ${area}
                        </div>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${recipe.strMeal}</h5>
                        <div class="recipe-meta">
                            <span class="recipe-country">
                                <i class="fas fa-globe-americas me-1"></i> ${area}
                            </span>
                            <span class="recipe-rating">
                                ${starsHtml} ${rating}
                            </span>
                        </div>
                        <p class="card-text">${instructions}</p>
                        <button class="btn btn-primary view-recipe-btn" 
                                data-id="${recipe.idMeal || recipe.id}"
                                data-name="${recipe.strMeal}">
                            <i class="fas fa-utensils me-2"></i>Lihat Resep
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners to "View Recipe" buttons
    container.querySelectorAll('.view-recipe-btn').forEach(button => {
        button.addEventListener('click', function() {
            const recipeId = this.getAttribute('data-id');
            const recipeName = this.getAttribute('data-name');
            showRecipeModal(recipeId, recipeName);
        });
    });
}

// Show recipe details modal
async function showRecipeModal(recipeId, recipeName) {
    showLoading(true);
    
    try {
        // Get recipe details
        const response = await fetch(`${API_BASE_URL}lookup.php?i=${recipeId}`);
        const data = await response.json();
        
        const recipe = data.meals ? data.meals[0] : null;
        
        if (!recipe) {
            throw new Error('Recipe not found');
        }
        
        // Build modal content
        let ingredientsHtml = '';
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`];
            const measure = recipe[`strMeasure${i}`];
            
            if (ingredient && ingredient.trim() !== '') {
                ingredientsHtml += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${ingredient}
                        <span class="badge bg-primary rounded-pill">${measure || 'Secukupnya'}</span>
                    </li>
                `;
            }
        }
        
        // Split instructions into steps
        const instructions = recipe.strInstructions || '';
        let instructionsHtml = '';
        if (instructions) {
            const steps = instructions.split(/\r\n|\n/).filter(step => step.trim() !== '');
            if (steps.length > 1) {
                instructionsHtml = '<ol class="list-group list-group-numbered mb-4">';
                steps.forEach(step => {
                    instructionsHtml += `<li class="list-group-item">${step}</li>`;
                });
                instructionsHtml += '</ol>';
            } else {
                instructionsHtml = `<div class="alert alert-light">${instructions}</div>`;
            }
        }
        
        const modalContent = `
            <div class="row">
                <div class="col-lg-5">
                    <img src="${recipe.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                         alt="${recipe.strMeal}" 
                         class="recipe-detail-img">
                    
                    <div class="card mb-4">
                        <div class="card-body">
                            <h6 class="card-title mb-3">Informasi Resep</h6>
                            <div class="row">
                                <div class="col-6 mb-2">
                                    <small class="text-muted">Kategori</small>
                                    <p class="mb-0 fw-bold">${recipe.strCategory || 'International'}</p>
                                </div>
                                <div class="col-6 mb-2">
                                    <small class="text-muted">Asal</small>
                                    <p class="mb-0 fw-bold">${recipe.strArea || 'International'}</p>
                                </div>
                                <div class="col-6 mb-2">
                                    <small class="text-muted">Tingkat Kesulitan</small>
                                    <p class="mb-0 fw-bold">${getRandomDifficulty()}</p>
                                </div>
                                <div class="col-6 mb-2">
                                    <small class="text-muted">Waktu</small>
                                    <p class="mb-0 fw-bold">${getRandomTime()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-7">
                    <h4 class="mb-4">${recipe.strMeal}</h4>
                    
                    <h5 class="mb-3">Bahan-bahan:</h5>
                    <ul class="list-group mb-4">
                        ${ingredientsHtml}
                    </ul>
                    
                    <h5 class="mb-3">Cara Membuat:</h5>
                    ${instructionsHtml}
                    
                    ${recipe.strYoutube ? `
                        <div class="mt-4">
                            <a href="${recipe.strYoutube}" target="_blank" class="btn btn-danger">
                                <i class="fab fa-youtube me-2"></i>Tonton Tutorial di YouTube
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('recipeModalTitle').innerHTML = `
            <i class="fas fa-utensils me-2"></i>${recipe.strMeal}
        `;
        document.getElementById('recipeModalBody').innerHTML = modalContent;
        
        // Show the modal
        const recipeModal = new bootstrap.Modal(document.getElementById('recipeModal'));
        recipeModal.show();
        
        // Add print functionality
        document.getElementById('printRecipeBtn').onclick = () => printRecipe(recipe);
        
    } catch (error) {
        console.error('Error loading recipe details:', error);
        document.getElementById('recipeModalBody').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Gagal memuat detail resep. Silakan coba lagi nanti.
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

// Initialize FAQ
function initializeFAQ() {
    const faqData = [
        {
            question: 'Apakah semua resep di WorldRecipe gratis?',
            answer: 'Ya, semua resep di WorldRecipe sepenuhnya gratis dan dapat diakses oleh siapa saja. Kami percaya bahwa memasak seharusnya dapat dinikmati oleh semua orang tanpa batasan biaya.'
        },
        {
            question: 'Bagaimana cara menyimpan resep favorit?',
            answer: 'Anda dapat membuat akun gratis untuk menyimpan resep favorit. Namun, Anda juga dapat mencetak resep atau menyimpan halaman untuk diakses nanti.'
        },
        {
            question: 'Apakah resep-resep ini sudah diuji kebenarannya?',
            answer: 'Ya, semua resep telah diuji oleh tim chef profesional kami untuk memastikan hasil yang optimal dan petunjuk yang mudah diikuti.'
        },
        {
            question: 'Bisakah saya mengirim resep saya sendiri?',
            answer: 'Kami sedang mengembangkan fitur untuk komunitas berbagi resep. Untuk saat ini, Anda dapat menghubungi kami melalui formulir kontak untuk berbagi resep Anda.'
        },
        {
            question: 'Apakah ada aplikasi mobile untuk WorldRecipe?',
            answer: 'Saat ini WorldRecipe tersedia dalam versi website yang responsif dan dapat diakses dengan optimal di semua perangkat mobile. Aplikasi native sedang dalam pengembangan.'
        },
        {
            question: 'Bagaimana jika saya alergi dengan bahan tertentu?',
            answer: 'Setiap resep dilengkapi dengan daftar bahan lengkap. Kami juga sedang mengembangkan fitur filter untuk alergen umum seperti kacang, susu, gluten, dll.'
        }
    ];
    
    const accordion = document.getElementById('faqAccordion');
    let faqHtml = '';
    
    faqData.forEach((faq, index) => {
        const isFirst = index === 0;
        
        faqHtml += `
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button ${isFirst ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#faq${index}">
                        ${faq.question}
                    </button>
                </h2>
                <div id="faq${index}" class="accordion-collapse collapse ${isFirst ? 'show' : ''}" data-bs-parent="#faqAccordion">
                    <div class="accordion-body">
                        ${faq.answer}
                    </div>
                </div>
            </div>
        `;
    });
    
    accordion.innerHTML = faqHtml;
}

// Setup event listeners
function setupEventListeners() {
    // Category filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Load filtered recipes
            loadFilteredRecipes(category);
        });
    });
    
    // Search functionality
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchRecipes(query);
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchRecipes(query);
            }
        }
    });
    
    // Voice search button
    const voiceSearchBtn = document.getElementById('voiceSearchBtn');
    voiceSearchBtn.addEventListener('click', () => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'id-ID';
            recognition.start();
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                searchInput.value = transcript;
                searchRecipes(transcript);
            };
        } else {
            alert('Browser tidak mendukung voice search.');
        }
    });
    
    // Search suggestions
    document.querySelectorAll('.suggestion').forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            searchInput.value = suggestion.textContent;
            searchRecipes(suggestion.textContent);
        });
    });
    
    // Contact form
    const contactForm = document.getElementById('contactForm');
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };
        
        // Simulate form submission
        showLoading(true);
        setTimeout(() => {
            showLoading(false);
            alert('Terima kasih! Pesan Anda telah berhasil dikirim. Kami akan membalas segera.');
            contactForm.reset();
        }, 1500);
    });
    
    // Newsletter form
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            
            if (email) {
                showLoading(true);
                setTimeout(() => {
                    showLoading(false);
                    alert('Terima kasih telah berlangganan newsletter kami!');
                    this.reset();
                }, 1000);
            }
        });
    }
    
    // Add hover effect to recipe cards
    document.addEventListener('mouseover', function(e) {
        if (e.target.closest('.recipe-card')) {
            const card = e.target.closest('.recipe-card');
            card.style.transform = 'translateY(-10px)';
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        if (e.target.closest('.recipe-card')) {
            const card = e.target.closest('.recipe-card');
            card.style.transform = 'translateY(0)';
        }
    });
}

// Search recipes
// Initialize search functionality
function initSearch() {
    // Handle search button click
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    // Handle Enter key in search input
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        // Show suggestions while typing
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    // Handle suggestion links
    suggestionLinks.forEach(link => {
        link.addEventListener('click', function() {
            searchInput.value = this.textContent;
            performSearch();
        });
    });
    
    // Mobile search toggle
    if (mobileSearchToggle) {
        mobileSearchToggle.addEventListener('click', toggleMobileSearch);
    }
}

// Handle search input with debounce
let searchTimeout;
function handleSearchInput() {
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        hideSearchSuggestions();
        return;
    }
    
    // Clear previous timeout
    clearTimeout(searchTimeout);
    
    // Set new timeout for debounce
    searchTimeout = setTimeout(() => {
        fetchSearchSuggestions(query);
    }, 300);
}

// Fetch search suggestions
async function fetchSearchSuggestions(query) {
    try {
        const response = await fetch(`${API_BASE_URL}search.php?s=${query}`);
        const data = await response.json();
        
        if (data.meals) {
            showSearchSuggestions(data.meals.slice(0, 5));
        } else {
            hideSearchSuggestions();
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        hideSearchSuggestions();
    }
}

// Show search suggestions
function showSearchSuggestions(meals) {
    if (!searchSuggestions || meals.length === 0) {
        hideSearchSuggestions();
        return;
    }
    
    const suggestionsHTML = meals.map(meal => `
        <div class="suggestion-item" data-meal-id="${meal.idMeal}">
            <div class="recipe-name">${meal.strMeal}</div>
            <div class="recipe-category">${meal.strCategory || 'International'}</div>
        </div>
    `).join('');
    
    searchSuggestions.innerHTML = suggestionsHTML;
    searchSuggestions.classList.add('show');
    
    // Add click event to suggestion items
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const mealId = this.getAttribute('data-meal-id');
            const mealName = this.querySelector('.recipe-name').textContent;
            searchInput.value = mealName;
            hideSearchSuggestions();
            performSearch();
        });
    });
}

// Hide search suggestions
function hideSearchSuggestions() {
    if (searchSuggestions) {
        searchSuggestions.classList.remove('show');
    }
}

// Perform search
function performSearch() {
    const query = searchInput.value.trim();
    
    if (query.length === 0) {
        // Show empty search message
        showToast('Silakan masukkan kata kunci pencarian', 'warning');
        return;
    }
    
    // Hide suggestions
    hideSearchSuggestions();
    
    // Perform search
    searchRecipes(query);
}

// Search recipes function
async function searchRecipes(query) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}search.php?s=${query}`);
        const data = await response.json();
        
        const recipes = data.meals || [];
        
        // Update search results header
        const resultsHeader = `
            <div class="search-results-header" data-aos="fade-up">
                <h3 class="section-title mb-2">Hasil Pencarian</h3>
                <p class="search-results-count">
                    Ditemukan ${recipes.length} resep untuk "<strong>${query}</strong>"
                </p>
            </div>
        `;
        
        // Clear previous results
        const container = document.querySelector('#filteredRecipesContainer');
        container.innerHTML = resultsHeader;
        
        if (recipes.length > 0) {
            // Display search results
            displayRecipes(recipes.slice(0, 9), '#filteredRecipesContainer', true);
            
            // Update URL hash for sharing
            window.location.hash = `search=${encodeURIComponent(query)}`;
            
            // Scroll to results
            document.querySelector('#categories').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Update filter buttons
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector('.filter-btn[data-category="all"]').classList.add('active');
        } else {
            container.innerHTML += `
                <div class="col-12 text-center" data-aos="fade-up">
                    <div class="alert alert-warning">
                        <i class="fas fa-search me-2"></i>
                        Tidak ditemukan resep dengan kata kunci "${query}". Coba kata kunci lain.
                        <div class="mt-3">
                            <button class="btn btn-outline-primary btn-sm me-2" data-suggestion="Pasta">Pasta</button>
                            <button class="btn btn-outline-primary btn-sm me-2" data-suggestion="Chicken">Ayam</button>
                            <button class="btn btn-outline-primary btn-sm me-2" data-suggestion="Beef">Daging Sapi</button>
                            <button class="btn btn-outline-primary btn-sm" data-suggestion="Dessert">Dessert</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners to suggestion buttons
            document.querySelectorAll('[data-suggestion]').forEach(button => {
                button.addEventListener('click', function() {
                    searchInput.value = this.getAttribute('data-suggestion');
                    performSearch();
                });
            });
        }
    } catch (error) {
        console.error('Error searching recipes:', error);
        document.querySelector('#filteredRecipesContainer').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Gagal melakukan pencarian. Silakan coba lagi nanti.
                </div>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

// Toggle mobile search
function toggleMobileSearch() {
    const mobileSearchContainer = document.querySelector('.mobile-search-container');
    if (mobileSearchContainer) {
        mobileSearchContainer.classList.toggle('show');
        if (mobileSearchContainer.classList.contains('show')) {
            setTimeout(() => {
                mobileSearchContainer.querySelector('input').focus();
            }, 100);
        }
    }
}

// Load search from URL hash
function loadSearchFromHash() {
    const hash = window.location.hash;
    if (hash.includes('search=')) {
        const query = decodeURIComponent(hash.split('search=')[1]);
        if (searchInput) {
            searchInput.value = query;
            setTimeout(() => performSearch(), 500);
        }
    }
}

// Toast notification
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToast = document.querySelector('.search-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `search-toast alert alert-${type} alert-dismissible fade show`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    `;
    
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// Close suggestions when clicking outside
document.addEventListener('click', function(event) {
    if (searchSuggestions && searchSuggestions.classList.contains('show')) {
        if (!searchInput.contains(event.target) && !searchSuggestions.contains(event.target)) {
            hideSearchSuggestions();
        }
    }
});

// Initialize search on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initSearch();
    loadSearchFromHash();
    
    // Handle hash changes
    window.addEventListener('hashchange', loadSearchFromHash);
});


// Helper functions
function getRandomDifficulty() {
    const difficulties = ['Mudah', 'Sedang', 'Sedang', 'Sulit'];
    return difficulties[Math.floor(Math.random() * difficulties.length)];
}

function getRandomTime() {
    const times = ['15-30 menit', '30-45 menit', '45-60 menit', '60-90 menit'];
    return times[Math.floor(Math.random() * times.length)];
}

function getFallbackRecipes() {
    return [
        {
            idMeal: "1",
            strMeal: "Spaghetti Carbonara",
            strCategory: "Pasta",
            strArea: "Italian",
            strInstructions: "Cook spaghetti. Fry pancetta. Mix eggs with cheese. Combine all ingredients. Serve hot.",
            strMealThumb: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            strYoutube: "https://www.youtube.com/watch?v=D_2DBLAt57c"
        },
        {
            idMeal: "2",
            strMeal: "Chicken Teriyaki",
            strCategory: "Chicken",
            strArea: "Japanese",
            strInstructions: "Marinate chicken in teriyaki sauce. Grill until cooked. Serve with rice and vegetables.",
            strMealThumb: "https://images.unsplash.com/photo-1562967914-608f82629710?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            strYoutube: "https://www.youtube.com/watch?v=4v9G2Ar0UsE"
        },
        {
            idMeal: "3",
            strMeal: "Beef Tacos",
            strCategory: "Beef",
            strArea: "Mexican",
            strInstructions: "Cook seasoned ground beef. Fill taco shells. Top with lettuce, cheese, and salsa.",
            strMealThumb: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            strYoutube: "https://www.youtube.com/watch?v=3lWQL_7qM8Y"
        },
        {
            idMeal: "4",
            strMeal: "Chicken Curry",
            strCategory: "Chicken",
            strArea: "Indian",
            strInstructions: "Cook chicken with spices and coconut milk. Serve with rice or naan bread.",
            strMealThumb: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            strYoutube: "https://www.youtube.com/watch?v=wC3sSf3oQ_g"
        },
        {
            idMeal: "5",
            strMeal: "Caesar Salad",
            strCategory: "Vegetarian",
            strArea: "American",
            strInstructions: "Mix romaine lettuce with Caesar dressing, croutons, and Parmesan cheese.",
            strMealThumb: "https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            strYoutube: "https://www.youtube.com/watch?v=ZbOZIJ9QYhQ"
        },
        {
            idMeal: "6",
            strMeal: "Chocolate Lava Cake",
            strCategory: "Dessert",
            strArea: "French",
            strInstructions: "Bake chocolate cakes with molten center. Serve warm with ice cream.",
            strMealThumb: "https://images.unsplash.com/photo-1624353365286-3f8d62dadadf?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            strYoutube: "https://www.youtube.com/watch?v=KgXKskffCoc"
        }
    ];
}

function showErrorMessages() {
    const errorHtml = `
        <div class="col-12 text-center" data-aos="fade-up">
            <div class="alert alert-warning">
                <i class="fas fa-wifi-slash me-2"></i>
                Gagal memuat data dari API. Menampilkan resep contoh.
            </div>
        </div>
    `;
    
    document.querySelector('#latestRecipesContainer').innerHTML = errorHtml;
    document.querySelector('#popularRecipesContainer').innerHTML = errorHtml;
    document.querySelector('#filteredRecipesContainer').innerHTML = errorHtml;
}

function printRecipe(recipe) {
    const printWindow = window.open('', '_blank');
    const printContent = `
        <html>
        <head>
            <title>${recipe.strMeal} - WorldRecipe</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #3498db; }
                .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .ingredients { margin: 20px 0; }
                .instructions { margin: 20px 0; }
                @media print {
                    body { padding: 0; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>${recipe.strMeal}</h1>
            <div class="info">
                <p><strong>Kategori:</strong> ${recipe.strCategory || 'International'}</p>
                <p><strong>Asal:</strong> ${recipe.strArea || 'International'}</p>
                <p><strong>Dicetak dari:</strong> WorldRecipe.com</p>
            </div>
            <div class="ingredients">
                <h3>Bahan-bahan:</h3>
                <ul>
                    ${Array.from({length: 20}, (_, i) => i + 1)
                        .map(i => {
                            const ingredient = recipe[`strIngredient${i}`];
                            const measure = recipe[`strMeasure${i}`];
                            return ingredient && ingredient.trim() ? 
                                `<li>${ingredient} - ${measure || 'Secukupnya'}</li>` : '';
                        })
                        .join('')}
                </ul>
            </div>
            <div class="instructions">
                <h3>Cara Membuat:</h3>
                <p>${(recipe.strInstructions || '').replace(/\r\n|\n/g, '<br>')}</p>
            </div>
            <button onclick="window.print()">Cetak</button>
            <button onclick="window.close()">Tutup</button>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}