// hybrid-search.js
// Интеграция гибридного поиска с интерфейсом Aurora

class AuroraSearchUI {
    constructor() {
        this.searchEngine = new HybridSearch();
        this.isInitialized = false;
        this.currentResults = [];
        
        // DOM элементы
        this.elements = {
            searchInput: null,
            resultsContainer: null,
            suggestionsContainer: null,
            statsElement: null,
            searchMode: null
        };
        
        this.init();
    }
    
    // Инициализация
    init() {
        this.findDOMElements();
        this.setupEventListeners();
        this.loadNotes();
        
        console.log('AuroraSearchUI: инициализирован');
    }
    
    // Поиск DOM элементов
    findDOMElements() {
        this.elements.searchInput = document.getElementById('search-input') || 
                                   document.querySelector('input[type="search"]');
        
        this.elements.resultsContainer = document.getElementById('search-results') ||
                                        document.querySelector('.search-results');
        
        if (!this.elements.resultsContainer) {
            this.elements.resultsContainer = document.createElement('div');
            this.elements.resultsContainer.className = 'search-results';
            if (this.elements.searchInput && this.elements.searchInput.parentNode) {
                this.elements.searchInput.parentNode.appendChild(this.elements.resultsContainer);
            }
        }
        
        // Создаем контейнер для подсказок
        this.elements.suggestionsContainer = document.createElement('div');
        this.elements.suggestionsContainer.className = 'search-suggestions';
        this.elements.suggestionsContainer.style.display = 'none';
        
        if (this.elements.searchInput && this.elements.searchInput.parentNode) {
            this.elements.searchInput.parentNode.insertBefore(
                this.elements.suggestionsContainer,
                this.elements.searchInput.nextSibling
            );
        }
        
        // Создаем элемент для статистики
        this.elements.statsElement = document.createElement('div');
        this.elements.statsElement.className = 'search-stats';
        this.elements.resultsContainer.parentNode.insertBefore(
            this.elements.statsElement,
            this.elements.resultsContainer
        );
    }
    
    // Настройка обработчиков событий
    setupEventListeners() {
        if (!this.elements.searchInput) return;
        
        // Поиск при вводе
        this.elements.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        // Поиск при нажатии Enter
        this.elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch(e.target.value, { forceSearch: true });
            }
        });
        
        // Фокус/блюр для подсказок
        this.elements.searchInput.addEventListener('focus', () => {
            if (this.elements.searchInput.value.length > 1) {
                this.showSuggestions(this.elements.searchInput.value);
            }
        });
        
        this.elements.searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideSuggestions();
            }, 200);
        });
        
        // Глобальное событие обновления заметок
        document.addEventListener('auroraNotesUpdated', () => {
            this.loadNotes();
        });
        
        // Событие для ручного поиска
        window.addEventListener('performSearch', (e) => {
            if (e.detail && e.detail.query) {
                this.handleSearch(e.detail.query, e.detail.options);
            }
        });
    }
    
    // Загрузка заметок из localStorage
    loadNotes() {
        try {
            const notesJson = localStorage.getItem('aurora-notes');
            const notes = notesJson ? JSON.parse(notesJson) : [];
            
            this.searchEngine.init(notes);
            this.isInitialized = true;
            
            // Показываем статистику
            this.updateStats();
            
            console.log(`Загружено ${notes.length} заметок`);
            
            // Если есть поисковый запрос, обновляем результаты
            if (this.elements.searchInput && this.elements.searchInput.value) {
                this.handleSearch(this.elements.searchInput.value);
            }
        } catch (error) {
            console.error('Ошибка загрузки заметок:', error);
            this.showError('Не удалось загрузить заметки');
        }
    }
    
    // Обработка поискового запроса
    handleSearch(query, options = {}) {
        if (!this.isInitialized) return;
        
        query = query.trim();
        
        // Показываем подсказки для коротких запросов
        if (query.length > 0 && query.length < 3 && !options.forceSearch) {
            this.showSuggestions(query);
            this.clearResults();
            return;
        }
        
        // Скрываем подсказки при серьезном поиске
        this.hideSuggestions();
        
        if (query.length === 0) {
            this.clearResults();
            return;
        }
        
        // Показываем индикатор загрузки
        this.showLoading();
        
        // Небольшая задержка для дебаунсинга
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query, options);
        }, 150);
    }
    
    // Выполнение поиска
    performSearch(query, options) {
        try {
            // Настройки поиска
            const searchOptions = {
                useSemantic: true,
                useKeywords: true,
                useTags: true,
                useDates: true,
                limit: 15,
                ...options
            };
            
            // Выполняем гибридный поиск
            this.currentResults = this.searchEngine.search(query, searchOptions);
            
            // Отображаем результаты
            this.displayResults(this.currentResults, query);
            
            // Обновляем статистику
            this.updateStats();
            
            // Логируем для отладки
            if (this.currentResults.length > 0) {
                console.log(`Найдено ${this.currentResults.length} результатов для "${query}"`);
            }
        } catch (error) {
            console.error('Ошибка поиска:', error);
            this.showError('Ошибка при выполнении поиска');
        }
    }
    
    // Отображение результатов
    displayResults(results, query) {
        if (!this.elements.resultsContainer) return;
        
        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }
        
        let html = `
            <div class="search-results-header">
                <h3>Результаты поиска: "${query}"</h3>
                <div class="results-count">Найдено: ${results.length}</div>
            </div>
        `;
        
        results.forEach((result, index) => {
            const note = result.note;
            const relevance = result.relevancePercent;
            
            html += `
                <div class="search-result" data-index="${result.index}">
                    <div class="result-header">
                        <div class="result-title">${this.highlightText(note.title || 'Без названия', query)}</div>
                        <div class="result-relevance">
                            <div class="relevance-label">Релевантность</div>
                            <div class="relevance-bar-container">
                                <div class="relevance-bar" style="width: ${relevance}%"></div>
                                <span class="relevance-value">${relevance}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="result-content">
                        ${this.getExcerpt(note.text, query, 200)}
                    </div>
                    
                    <div class="result-footer">
                        <div class="result-meta">
                            <span class="result-date">${this.formatDate(note.date)}</span>
                            ${note.tags && note.tags.length > 0 ? `
                                <div class="result-tags">
                                    ${note.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                        
                        ${result.reasons && result.reasons.length > 0 ? `
                            <div class="result-reasons">
                                <small>Найдено по: ${result.reasons.slice(0, 2).join(', ')}</small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        this.elements.resultsContainer.innerHTML = html;
        this.addResultClickHandlers();
    }
    
    // Показ "нет результатов"
    showNoResults(query) {
        if (!this.elements.resultsContainer) return;
        
        const suggestions = this.searchEngine.suggest(query);
        
        let suggestionsHtml = '';
        if (suggestions.length > 0) {
            suggestionsHtml = `
                <div class="no-results-suggestions">
                    <p>Возможно, вы имели в виду:</p>
                    <div class="suggestion-list">
                        ${suggestions.map(s => `
                            <button class="suggestion-btn" data-suggestion="${s.text}">
                                ${s.type === 'tag' ? s.text : s.text}
                                <span class="suggestion-count">(${s.count})</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        this.elements.resultsContainer.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>По запросу "${query}" ничего не найдено</h3>
                <p>Попробуйте:</p>
                <ul class="search-tips">
                    <li>Используйте другие ключевые слова</li>
                    <li>Попробуйте поиск по тегам (например, #идея)</li>
                    <li>Сформулируйте запрос по-другому</li>
                    <li>Проверьте правописание</li>
                </ul>
                ${suggestionsHtml}
            </div>
        `;
        
        // Добавляем обработчики для кнопок предложений
        this.elements.resultsContainer.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const suggestion = e.target.dataset.suggestion;
                this.elements.searchInput.value = suggestion;
                this.handleSearch(suggestion, { forceSearch: true });
            });
        });
    }
    
    // Очистка результатов
    clearResults() {
        if (this.elements.resultsContainer) {
            this.elements.resultsContainer.innerHTML = '';
        }
        if (this.elements.statsElement) {
            this.elements.statsElement.style.display = 'none';
        }
    }
    
    // Показ подсказок
    showSuggestions(query) {
        if (!this.elements.suggestionsContainer || query.length < 1) return;
        
        const suggestions = this.searchEngine.suggest(query);
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        let html = '<div class="suggestions-list">';
        
        suggestions.forEach(suggestion => {
            const typeIcon = suggestion.type === 'tag' ? '#' : '🔍';
            html += `
                <div class="suggestion-item" data-suggestion="${suggestion.text}">
                    <span class="suggestion-icon">${typeIcon}</span>
                    <span class="suggestion-text">${suggestion.text}</span>
                    <span class="suggestion-count">${suggestion.count}</span>
                </div>
            `;
        });
        
        html += '</div>';
        
        this.elements.suggestionsContainer.innerHTML = html;
        this.elements.suggestionsContainer.style.display = 'block';
        
        // Добавляем обработчики для подсказок
        this.elements.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const suggestion = e.currentTarget.dataset.suggestion;
                this.elements.searchInput.value = suggestion;
                this.handleSearch(suggestion, { forceSearch: true });
                this.hideSuggestions();
            });
        });
    }
    
    // Скрытие подсказок
    hideSuggestions() {
        if (this.elements.suggestionsContainer) {
            this.elements.suggestionsContainer.style.display = 'none';
        }
    }
    
    // Показ загрузки
    showLoading() {
        if (!this.elements.resultsContainer) return;
        
        this.elements.resultsContainer.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <p>Ищу в ваших заметках...</p>
                <p class="loading-sub">Анализирую смысл, теги и ключевые слова</p>
            </div>
        `;
    }
    
    // Показ ошибки
    showError(message) {
        if (!this.elements.resultsContainer) return;
        
        this.elements.resultsContainer.innerHTML = `
            <div class="search-error">
                <div class="error-icon">⚠️</div>
                <h3>Ошибка поиска</h3>
                <p>${message}</p>
                <button class="retry-btn">Попробовать снова</button>
            </div>
        `;
        
        // Обработчик для кнопки повтора
        this.elements.resultsContainer.querySelector('.retry-btn')?.addEventListener('click', () => {
            this.loadNotes();
            if (this.elements.searchInput.value) {
                this.handleSearch(this.elements.searchInput.value);
            }
        });
    }
    
    // Обновление статистики
    updateStats() {
        if (!this.elements.statsElement) return;
        
        const stats = this.searchEngine.getStats();
        
        if (stats.totalNotes === 0) {
            this.elements.statsElement.style.display = 'none';
            return;
        }
        
        this.elements.statsElement.style.display = 'block';
        this.elements.statsElement.innerHTML = `
            <div class="stats-content">
                <span class="stat-item">
                    <span class="stat-label">Заметок:</span>
                    <span class="stat-value">${stats.totalNotes}</span>
                </span>
                <span class="stat-item">
                    <span class="stat-label">Проиндексировано:</span>
                    <span class="stat-value">${stats.indexedWords} слов, ${stats.indexedTags} тегов</span>
                </span>
                <span class="stat-hint">Гибридный поиск Aurora активен</span>
            </div>
        `;
    }
    
    // Вспомогательные методы
    
    highlightText(text, query) {
        if (!text || !query) return text || '';
        
        const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
        let result = text;
        
        queryWords.forEach(word => {
            if (word.length < 3) return;
            const regex = new RegExp(`(${this.escapeRegExp(word)})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        });
        
        return result;
    }
    
    getExcerpt(text, query, maxLength = 150) {
        if (!text) return '';
        
        // Находим наиболее релевантную часть
        const sentences = text.split(/[.!?]+/);
        let bestSentence = sentences[0];
        let maxScore = 0;
        
        const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
        
        sentences.forEach(sentence => {
            let score = 0;
            const sentenceLower = sentence.toLowerCase();
            
            queryWords.forEach(word => {
                if (sentenceLower.includes(word)) {
                    score += 2;
                }
            });
            
            // Бонус за начало предложения
            if (sentence.length > 20 && sentence.length < maxLength * 1.5) {
                score += 1;
            }
            
            if (score > maxScore) {
                maxScore = score;
                bestSentence = sentence.trim();
            }
        });
        
        // Обрезаем если нужно
        if (bestSentence.length > maxLength) {
            bestSentence = bestSentence.substring(0, maxLength) + '...';
        }
        
        return this.highlightText(bestSentence, query) || '...';
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }
    
    addResultClickHandlers() {
        this.elements.resultsContainer.querySelectorAll('.search-result').forEach(result => {
            result.addEventListener('click', (e) => {
                const index = result.dataset.index;
                const note = this.currentResults.find(r => r.index == index)?.note;
                
                if (note) {
                    // Создаем событие для открытия заметки
                    const event = new CustomEvent('openNote', {
                        detail: { note, index }
                    });
                    document.dispatchEvent(event);
                    
                    // Прокручиваем к заметке (если есть такая функциональность)
                    this.scrollToNote(index);
                }
            });
        });
    }
    
    scrollToNote(index) {
        // Реализуй в зависимости от твоей структуры приложения
        console.log('Открываем заметку с индексом:', index);
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Инициализация при загрузке страницы
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // Небольшая задержка для полной загрузки
        setTimeout(() => {
            window.auroraSearch = new AuroraSearchUI();
            console.log('Aurora гибридный поиск готов к работе!');
        }, 100);
    });
}
