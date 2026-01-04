// semantic-search.js
// Гибридный поисковый движок Aurora

class HybridSearch {
    constructor() {
        this.notes = [];
        this.embeddings = new Map(); // Векторные представления заметок
        this.keywordIndex = new Map(); // Индекс по ключевым словам
        this.tagIndex = new Map(); // Индекс по тегам
        this.dateIndex = new Map(); // Индекс по датам
        this.stopWords = new Set(this.getStopWords());
    }
    
    // Инициализация с существующими заметками
    init(notesArray) {
        if (!notesArray || !Array.isArray(notesArray)) {
            console.warn('HybridSearch: notesArray is empty or invalid');
            this.notes = [];
            return;
        }
        
        this.notes = notesArray;
        console.log(`HybridSearch: инициализирован с ${notesArray.length} заметками`);
        this.buildIndices();
    }
    
    // Построение всех индексов
    buildIndices() {
        this.keywordIndex.clear();
        this.tagIndex.clear();
        this.dateIndex.clear();
        this.embeddings.clear();
        
        this.notes.forEach((note, index) => {
            if (!note || !note.text) return;
            
            const text = (note.title || '') + ' ' + (note.text || '');
            const words = this.tokenize(text);
            
            // 1. Индекс по ключевым словам
            words.forEach(word => {
                if (!this.keywordIndex.has(word)) {
                    this.keywordIndex.set(word, []);
                }
                this.keywordIndex.get(word).push(index);
            });
            
            // 2. Индекс по тегам
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => {
                    const cleanTag = tag.toLowerCase().trim();
                    if (!this.tagIndex.has(cleanTag)) {
                        this.tagIndex.set(cleanTag, []);
                    }
                    this.tagIndex.get(cleanTag).push(index);
                });
            }
            
            // 3. Индекс по датам
            if (note.date) {
                const dateKey = note.date.substring(0, 7); // Год-месяц
                if (!this.dateIndex.has(dateKey)) {
                    this.dateIndex.set(dateKey, []);
                }
                this.dateIndex.get(dateKey).push(index);
            }
            
            // 4. Векторное представление для семантического поиска
            this.embeddings.set(index, this.createEmbedding(text));
        });
        
        console.log(`Построены индексы: ${this.keywordIndex.size} слов, ${this.tagIndex.size} тегов`);
    }
    
    // Токенизация с поддержкой русского языка
    tokenize(text) {
        if (!text) return [];
        
        return text.toLowerCase()
            .replace(/[^\wа-яё\s\-]/g, ' ') // Сохраняем дефисы
            .split(/\s+/)
            .filter(word => 
                word.length > 2 && 
                !this.stopWords.has(word) &&
                !/^\d+$/.test(word) // Исключаем чисто числа
            )
            .map(word => word.replace(/^-+|-+$/g, '')); // Убираем дефисы по краям
    }
    
    // Список стоп-слов (русские + английские)
    getStopWords() {
        return [
            // Русские
            'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 
            'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 
            'вы', 'за', 'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 
            'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'когда', 'даже', 
            'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него', 
            'до', 'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 
            'себя', 'ничего', 'ей', 'может', 'они', 'тут', 'где', 'есть', 'надо', 
            'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб', 'без', 
            'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет', 'ж', 'тогда', 
            'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 
            'здесь', 'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас', 
            'были', 'куда', 'зачем', 'всех', 'никогда', 'можно', 'при', 'наконец', 
            'два', 'об', 'другой', 'хоть', 'после', 'над', 'больше', 'тот', 'через', 
            'эти', 'нас', 'про', 'всего', 'них', 'какая', 'много', 'разве', 'три', 
            'эту', 'моя', 'впрочем', 'хорошо', 'свою', 'этой', 'перед', 'иногда', 
            'лучше', 'чуть', 'том', 'нельзя', 'такой', 'им', 'более', 'всегда', 
            'конечно', 'всю', 'между',
            
            // Английские
            'the', 'and', 'for', 'with', 'that', 'this', 'not', 'but', 'from', 
            'have', 'are', 'was', 'were', 'will', 'would', 'could', 'should', 
            'can', 'may', 'might', 'must', 'shall'
        ];
    }
    
    // Создание векторного представления (упрощенное)
    createEmbedding(text) {
        const words = this.tokenize(text);
        const vector = {};
        const totalWords = words.length;
        
        words.forEach(word => {
            vector[word] = (vector[word] || 0) + 1;
        });
        
        // Нормализация (TF, упрощенно)
        Object.keys(vector).forEach(word => {
            vector[word] = vector[word] / totalWords;
        });
        
        return vector;
    }
    
    // Косинусное сходство между векторами
    cosineSimilarity(vecA, vecB) {
        const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        keys.forEach(key => {
            const a = vecA[key] || 0;
            const b = vecB[key] || 0;
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        });
        
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    // ГИБРИДНЫЙ ПОИСК - основная функция
    search(query, options = {}) {
        const {
            useSemantic = true,
            useKeywords = true,
            useTags = true,
            useDates = true,
            limit = 10,
            minRelevance = 0.1
        } = options;
        
        const results = new Map(); // noteIndex -> {score, reasons: []}
        
        // Анализ запроса
        const queryLower = query.toLowerCase().trim();
        
        // 1. Поиск по тегам (если есть #)
        if (useTags) {
            const tagMatches = queryLower.match(/#(\w+)/g);
            if (tagMatches) {
                tagMatches.forEach(tagMatch => {
                    const tag = tagMatch.substring(1).toLowerCase();
                    const matches = this.tagIndex.get(tag) || [];
                    matches.forEach(noteIndex => {
                        const current = results.get(noteIndex) || { score: 0, reasons: [] };
                        current.score += 1.5; // Высокий вес для тегов
                        current.reasons.push(`Тег: #${tag}`);
                        results.set(noteIndex, current);
                    });
                });
            }
        }
        
        // 2. Поиск по датам (если есть дата)
        if (useDates) {
            const dateMatches = queryLower.match(/\d{4}[-\.]\d{2}/g) || 
                               queryLower.match(/\d{2}\.\d{2}\.\d{4}/g);
            if (dateMatches) {
                dateMatches.forEach(dateStr => {
                    let dateKey = dateStr;
                    if (dateStr.includes('.')) {
                        const parts = dateStr.split('.');
                        dateKey = `${parts[2]}-${parts[1]}`;
                    }
                    
                    const matches = this.dateIndex.get(dateKey) || [];
                    matches.forEach(noteIndex => {
                        const current = results.get(noteIndex) || { score: 0, reasons: [] };
                        current.score += 1.2;
                        current.reasons.push(`Дата: ${dateStr}`);
                        results.set(noteIndex, current);
                    });
                });
            }
        }
        
        // 3. Поиск по ключевым словам
        if (useKeywords) {
            const queryWords = this.tokenize(queryLower.replace(/[#\d\.-]/g, ' '));
            
            queryWords.forEach(word => {
                const matches = this.keywordIndex.get(word) || [];
                matches.forEach(noteIndex => {
                    const current = results.get(noteIndex) || { score: 0, reasons: [] };
                    current.score += 1.0;
                    if (!current.reasons.includes(`Ключ: ${word}`)) {
                        current.reasons.push(`Ключ: ${word}`);
                    }
                    results.set(noteIndex, current);
                });
            });
        }
        
        // 4. Семантический поиск (по смыслу)
        if (useSemantic && queryWords && queryWords.length > 0) {
            const queryEmbedding = this.createEmbedding(queryLower);
            
            this.embeddings.forEach((noteEmbedding, noteIndex) => {
                const similarity = this.cosineSimilarity(queryEmbedding, noteEmbedding);
                
                if (similarity > minRelevance) {
                    const current = results.get(noteIndex) || { score: 0, reasons: [] };
                    current.score += similarity * 0.8;
                    if (similarity > 0.3) {
                        current.reasons.push(`По смыслу: ${Math.round(similarity * 100)}%`);
                    }
                    results.set(noteIndex, current);
                }
            });
        }
        
        // 5. Фильтрация и сортировка
        const processedResults = Array.from(results.entries())
            .filter(([_, data]) => data.score > 0)
            .map(([noteIndex, data]) => ({
                note: this.notes[noteIndex],
                score: data.score,
                reasons: data.reasons,
                index: noteIndex,
                relevancePercent: Math.min(Math.round(data.score * 50), 100) // Нормализация до 100%
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        
        return processedResults;
    }
    
    // Автодополнение и подсказки
    suggest(query) {
        const suggestions = {
            tags: [],
            keywords: [],
            dates: []
        };
        
        const queryLower = query.toLowerCase().trim();
        
        if (queryLower.length < 2) return suggestions;
        
        // Подсказки тегов
        this.tagIndex.forEach((notes, tag) => {
            if (tag.startsWith(queryLower) || queryLower.includes('#')) {
                suggestions.tags.push({
                    type: 'tag',
                    text: `#${tag}`,
                    count: notes.length
                });
            }
        });
        
        // Подсказки ключевых слов
        this.keywordIndex.forEach((notes, word) => {
            if (word.startsWith(queryLower) && notes.length > 1) {
                suggestions.keywords.push({
                    type: 'keyword',
                    text: word,
                    count: notes.length
                });
            }
        });
        
        // Сортировка по популярности
        suggestions.tags.sort((a, b) => b.count - a.count);
        suggestions.keywords.sort((a, b) => b.count - a.count);
        
        // Объединяем и ограничиваем
        return [
            ...suggestions.tags.slice(0, 3),
            ...suggestions.keywords.slice(0, 3)
        ].slice(0, 5);
    }
    
    // Получение статистики
    getStats() {
        return {
            totalNotes: this.notes.length,
            indexedWords: this.keywordIndex.size,
            indexedTags: this.tagIndex.size,
            indexedDates: this.dateIndex.size
        };
    }
}

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.HybridSearch = HybridSearch;
}
