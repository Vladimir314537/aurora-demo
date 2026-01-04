import streamlit as st
import time
from datetime import datetime

# ========== НАСТРОЙКА ==========
st.set_page_config(
    page_title="Aurora Safe Demo",
    page_icon="🔒",
    layout="wide"
)

st.title("🔒 Aurora Safe: Приватный ИИ-дневник")
st.markdown("**Рабочее демо • 100% локально • Готово к использованию**")

# ========== ДЕМО-ДАННЫЕ ==========
DEMO_NOTES = [
    {"id": 1, "text": "Запись к врачу терапевту на следующей неделе.", "tags": "медицина, врач"},
    {"id": 2, "text": "Консультация у уролога по результатам анализов.", "tags": "медицина, врач"},
    {"id": 3, "text": "Купить свежие булки к завтраку.", "tags": "еда, продукты"},
    {"id": 4, "text": "Рецепт домашнего хлеба с семенами.", "tags": "еда, кулинария"},
    {"id": 5, "text": "Идея для стартапа: приватный ИИ-дневник Aurora.", "tags": "бизнес, стартап"},
    {"id": 6, "text": "Встреча с инвесторами в четверг в 15:00.", "tags": "бизнес, встреча"},
    {"id": 7, "text": "Начать бегать по утрам для энергии и здоровья.", "tags": "здоровье, спорт"},
    {"id": 8, "text": "Нужно больше спать и правильно питаться.", "tags": "здоровье, образ жизни"},
    {"id": 9, "text": "Изучить zero-trust архитектуру для проекта Aurora.", "tags": "технологии, безопасность"},
    {"id": 10, "text": "Настроить шифрование данных на сервере.", "tags": "технологии, программирование"}
]

# ========== ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ ==========
if 'notes' not in st.session_state:
    st.session_state.notes = DEMO_NOTES.copy()

if 'search_results' not in st.session_state:
    st.session_state.search_results = []

if 'search_query' not in st.session_state:
    st.session_state.search_query = ""

# ========== ПРОСТЫЕ ФУНКЦИИ ==========
def add_note(text, tags=""):
    """Добавить новую заметку"""
    if not text.strip():
        return False
    
    new_note = {
        "id": len(st.session_state.notes) + 1,
        "text": text.strip(),
        "tags": tags.strip() if tags else "",
        "time": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "user": True
    }
    
    st.session_state.notes.append(new_note)
    return True

def delete_note(note_id):
    """Удалить заметку"""
    st.session_state.notes = [n for n in st.session_state.notes if n["id"] != note_id]
    return True

def search_notes(query):
    """Поиск по заметкам"""
    if not query.strip():
        return []
    
    query_lower = query.lower().strip()
    results = []
    
    for note in st.session_state.notes:
        score = 0
        
        # Поиск в тексте
        if query_lower in note["text"].lower():
            score += 1.0
        
        # Поиск в тегах
        tags = note.get("tags", "")
        if tags and query_lower in tags.lower():
            score += 0.8
        
        # Точное совпадение
        if query_lower == note["text"].lower().strip():
            score += 0.5
        
        if score > 0:
            results.append({
                "text": note["text"],
                "score": min(score, 1.0),
                "tags": note.get("tags", ""),
                "time": note.get("time", ""),
                "id": note["id"]
            })
    
    # Сортировка по релевантности
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:8]

# ========== ИНТЕРФЕЙС ==========
tab1, tab2, tab3, tab4 = st.tabs(["📝 Дневник", "🔍 Поиск", "🔐 Безопасность", "⚙️ Архитектура"])

# ---- ВКЛАДКА 1: ДНЕВНИК ----
with tab1:
    st.header("📝 Ваш приватный дневник")
    
    # Статистика
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Всего заметок", len(st.session_state.notes))
    with col2:
        demo_count = len([n for n in st.session_state.notes if not n.get("user", False)])
        st.metric("Демо-заметок", demo_count)
    with col3:
        user_count = len([n for n in st.session_state.notes if n.get("user", False)])
        st.metric("Ваших заметок", user_count)
    
    # Демо-заметки
    st.subheader("🎯 Демо-заметки (10 разных тем)")
    
    for i in range(0, len(DEMO_NOTES), 2):
        cols = st.columns(2)
        for j in range(2):
            if i + j < len(DEMO_NOTES):
                note = DEMO_NOTES[i + j]
                with cols[j]:
                    st.info(f"**{note['text']}**")
                    if note["tags"]:
                        st.caption(f"🏷️ Теги: {note['tags']}")
    
    st.divider()
    
    # Пользовательские заметки
    user_notes = [n for n in st.session_state.notes if n.get("user", False)]
    
    if user_notes:
        st.subheader("💾 Ваши заметки")
        
        for note in user_notes:
            col1, col2 = st.columns([5, 1])
            with col1:
                st.markdown(f"**{note['text']}**")
                if note.get("tags"):
                    st.caption(f"🏷️ Теги: {note['tags']}")
                if note.get("time"):
                    st.caption(f"⏰ Добавлено: {note['time']}")
            
            with col2:
                if st.button("🗑️", key=f"del_{note['id']}"):
                    delete_note(note['id'])
                    st.success("✅ Заметка удалена!")
                    time.sleep(1)
                    st.rerun()
            
            st.divider()
    
    # Добавление новой заметки
    st.subheader("➕ Добавить новую заметку")
    
    with st.form("new_note_form", clear_on_submit=True):
        note_text = st.text_area(
            "Ваша мысль или идея:",
            height=100,
            placeholder="Что у вас на уме?..",
            help="Чем подробнее, тем лучше"
        )
        
        note_tags = st.text_input(
            "Теги (через запятую):",
            placeholder="работа, идея, здоровье...",
            help="Необязательно, но улучшит поиск"
        )
        
        submitted = st.form_submit_button("💾 Сохранить заметку", type="primary", use_container_width=True)
        
        if submitted:
            if note_text.strip():
                if add_note(note_text, note_tags):
                    st.success("✅ Заметка сохранена!")
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("❌ Ошибка при сохранении")
            else:
                st.warning("⚠️ Введите текст заметки")

# ---- ВКЛАДКА 2: ПОИСК ----
with tab2:
    st.header("🔍 Умный поиск по дневнику")
    st.markdown("Ищет по тексту заметок и тегам")
    
    # Поисковая строка
    search_query = st.text_input(
        "Что ищем?",
        value=st.session_state.search_query,
        placeholder="Например: врач, булки, идея, бегать...",
        key="search_input"
    )
    
    # Кнопка поиска
    if st.button("🎯 Начать поиск", type="primary", use_container_width=True):
        if search_query.strip():
            st.session_state.search_query = search_query
            results = search_notes(search_query)
            st.session_state.search_results = results
            
            if results:
                st.success(f"✅ Найдено {len(results)} заметок")
                
                for i, result in enumerate(results):
                    with st.container():
                        # Релевантность
                        relevance = result["score"] * 100
                        color = "#10B981" if relevance > 70 else "#F59E0B" if relevance > 40 else "#EF4444"
                        
                        st.markdown(f"""
                        <div style="
                            border-left: 5px solid {color};
                            padding: 12px;
                            margin: 10px 0;
                            background: rgba(249, 250, 251, 0.8);
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong>🔍 Результат #{i+1}</strong>
                                <span style="color: {color}; font-weight: bold;">{relevance:.0f}%</span>
                            </div>
                            <p style="margin: 8px 0;">{result['text']}</p>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        # Дополнительная информация
                        if result.get("tags"):
                            st.caption(f"🏷️ Теги: {result['tags']}")
                        if result.get("time"):
                            st.caption(f"⏰ Добавлено: {result['time']}")
                        
                        st.divider()
            else:
                st.warning("🤔 Ничего не найдено. Попробуйте другие слова.")
        else:
            st.warning("⚠️ Введите поисковый запрос")
    
    # Быстрые тесты
    st.divider()
    st.subheader("🧪 Тестовые запросы")
    
    test_cols = st.columns(4)
    tests = [
        ("врач", "Медицинские заметки"),
        ("булки", "Заметки про еду"),
        ("идея", "Бизнес-заметки"),
        ("бегать", "Заметки о здоровье")
    ]
    
    for i, (query, desc) in enumerate(tests):
        with test_cols[i]:
            if st.button(query, help=desc, use_container_width=True, key=f"test_{i}"):
                st.session_state.search_query = query
                st.rerun()

# ---- ВКЛАДКА 3: БЕЗОПАСНОСТЬ ----
with tab3:
    st.header("🔐 Безопасность Aurora")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🎨 Архитектура «Куратор»")
        st.markdown("""
        **Работает на вашем устройстве:**
        
        1. **Понимает запрос** — семантический анализ
        2. **Находит заметки** — гибридный поиск
        3. **Анонимизирует** — удаляет личные данные
        4. **Показывает контекст** — что будет отправлено
        5. **Спрашивает разрешение** — ваш контроль
        """)
        
        st.image("https://via.placeholder.com/400x200/8B5CF6/FFFFFF?text=Куратор+(Локально)", use_column_width=True)
    
    with col2:
        st.subheader("🚀 Архитектура «Аналитик»")
        st.markdown("""
        **Работает в облаке (безопасно):**
        
        1. **Получает контекст** — только обезличенный
        2. **Обрабатывает в изоляции** — zero-trust контейнер
        3. **Не имеет доступа** — к сети и вашим данным
        4. **Возвращает ответ** — зашифрованный
        5. **Уничтожает среду** — после обработки
        """)
        
        st.image("https://via.placeholder.com/400x200/10B981/FFFFFF?text=Аналитик+(Облако)", use_column_width=True)
    
    # Сравнение
    st.divider()
    st.subheader("📊 Сравнение: Демо vs Продукт")
    
    comp_cols = st.columns(2)
    with comp_cols[0]:
        st.markdown("### 🧪 Это демо")
        st.markdown("""
        - ✅ Данные в браузере
        - ✅ Ничего не отправляется
        - ❌ Нет шифрования
        - ❌ Нет постоянного хранения
        """)
    
    with comp_cols[1]:
        st.markdown("### 🚀 Полный продукт")
        st.markdown("""
        - ✅ AES-256-GCM шифрование
        - ✅ Secure Enclave для ключей
        - ✅ Zero-trust архитектура
        - ✅ Локальное + облачное (опция)
        """)

# ---- ВКЛАДКА 4: АРХИТЕКТУРА ----
with tab4:
    st.header("🏗️ Архитектура Aurora")
    
    # Три уровня
    st.subheader("🎯 Три уровня приватности")
    
    levels = st.columns(3)
    
    with levels[0]:
        st.markdown("### 🛡️ Уровень 1: «Сейф»")
        st.markdown("""
        **100% локально**
        
        - Всё на устройстве
        - Без интернета
        - Быстрый ответ (1-3 сек)
        - Базовая ИИ-логика
        """)
        st.progress(1.0, text="MVP")
    
    with levels[1]:
        st.markdown("### ⚡ Уровень 2: «Советник»")
        st.markdown("""
        **Осознанный компромисс**
        
        - Куратор (локально)
        - Аналитик (облако)
        - Zero-trust
        - Полный контроль
        """)
        st.progress(0.5, text="В разработке")
    
    with levels[2]:
        st.markdown("### 🌟 Уровень 3: «Наследие»")
        st.markdown("""
        **Цифровая капсула**
        
        - Передача мыслей
        - Настройка доступа
        - Шифрование времени
        - Вечное хранение
        """)
        st.progress(0.2, text "План")
    
    # Технический стек
    st.divider()
    st.subheader("🛠️ Технический стек")
    
    tech_cols = st.columns(2)
    
    with tech_cols[0]:
        st.markdown("### 🖥️ Клиент")
        st.markdown("""
        - **БД**: ChromaDB (векторная)
        - **Поиск**: Faiss + SQLite FTS5
        - **Модель**: Llama 3.2-1B (квант.)
        - **Интерфейс**: React/Electron
        """)
    
    with tech_cols[1]:
        st.markdown("### ☁️ Сервер")
        st.markdown("""
        - **Изоляция**: Docker + gVisor
        - **Безопасность**: seccomp, AppArmor
        - **Мониторинг**: eBPF
        - **Шифрование**: AES-256-GCM
        """)
    
    # Дорожная карта
    st.divider()
    st.subheader("🗺️ Дорожная карта")
    
    roadmap = st.columns(3)
    
    with roadmap[0]:
        st.markdown("### 🎯 Этап 1 (4 мес)")
        st.markdown("""
        **MVP «Сейф»**
        - Локальный поиск
        - Базовый интерфейс
        - Сохранение данных
        - Экспорт/импорт
        
        **Бюджет**: 500 000 ₽
        """)
    
    with roadmap[1]:
        st.markdown("### 🚀 Этап 2 (6 мес)")
        st.markdown("""
        **«Советник»**
        - Куратор & Аналитик
        - Zero-trust
        - Мобильные приложения
        - B2B-интеграции
        
        **Бюджет**: 2 000 000 ₽
        """)
    
    with roadmap[2]:
        st.markdown("### 🌟 Этап 3 (12 мес)")
        st.markdown("""
        **«Наследие»**
        - Цифровые капсулы
        - Продвинутый ИИ
        - Экосистема
        - Enterprise
        
        **Масштаб**: Рост аудитории
        """)

# ========== ФУТЕР ==========
st.divider()

footer_cols = st.columns(4)

with footer_cols[0]:
    st.caption("🔒 **Приватность**")
    st.caption("Ваши мысли — только ваши")

with footer_cols[1]:
    st.caption("⚡ **Производительность**")
    st.caption("Мгновенный поиск")

with footer_cols[2]:
    st.caption("🎯 **Точность**")
    st.caption("Умные алгоритмы")

with footer_cols[3]:
    if st.button("🔄 Обновить демо", use_container_width=True):
        st.rerun()

st.caption("""
**Aurora** — приватный ИИ-дневник. Это демо показывает базовую функциональность и архитектуру.
Полная версия с гибридным поиском и шифрованием в разработке.
""")
