document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const dueDateInput = document.getElementById('dueDateInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const sortLinks = document.querySelectorAll('.sort-content a');
    const searchInput = document.getElementById('searchInput');
    const taskCount = document.getElementById('taskCount');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const exportTasksBtn = document.getElementById('exportTasks');
    const toast = document.getElementById('toast');
    const toastTitle = document.querySelector('.toast-title');
    const toastMessage = document.querySelector('.toast-message');
    
    // State variables
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';
    let currentSort = 'date-added';
    let searchQuery = '';
    
    // Initialize the app
    function init() {
        renderTasks();
        updateTaskCount();
        setupEventListeners();
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Add task
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
        
        // Filter tasks
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderTasks();
            });
        });
        
        // Sort tasks
        sortLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                currentSort = this.dataset.sort;
                renderTasks();
                showToast('Sort Changed', `Tasks sorted by ${this.textContent}`);
            });
        });
        
        // Search tasks
        searchInput.addEventListener('input', function() {
            searchQuery = this.value.toLowerCase();
            renderTasks();
        });
        
        // Clear completed tasks
        clearCompletedBtn.addEventListener('click', clearCompletedTasks);
        
        // Export tasks
        exportTasksBtn.addEventListener('click', exportTasks);
        
        // Close toast
        document.querySelector('.toast .close').addEventListener('click', function() {
            toast.classList.remove('active');
        });
    }
    
    // Add a new task
    function addTask() {
        const text = taskInput.value.trim();
        const priority = prioritySelect.value;
        const dueDate = dueDateInput.value;
        
        if (text === '') {
            showToast('Error', 'Please enter a task');
            taskInput.focus();
            return;
        }
        
        const newTask = {
            id: Date.now(),
            text,
            priority,
            dueDate,
            completed: false,
            dateAdded: new Date().toISOString()
        };
        
        tasks.unshift(newTask);
        saveTasks();
        renderTasks();
        updateTaskCount();
        
        // Reset input fields
        taskInput.value = '';
        dueDateInput.value = '';
        taskInput.focus();
        
        showToast('Task Added', 'New task added successfully');
    }
    
    // Render tasks based on current filter, sort, and search
    function renderTasks() {
        // Filter tasks
        let filteredTasks = tasks.filter(task => {
            const matchesFilter = currentFilter === 'all' || 
                                (currentFilter === 'active' && !task.completed) || 
                                (currentFilter === 'completed' && task.completed);
            
            const matchesSearch = task.text.toLowerCase().includes(searchQuery);
            
            return matchesFilter && matchesSearch;
        });
        
        // Sort tasks
        sortTasks(filteredTasks);
        
        // Display tasks
        taskList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = searchQuery ? 'No tasks match your search' : 
                                      currentFilter === 'all' ? 'No tasks yet. Add one above!' :
                                      currentFilter === 'active' ? 'No active tasks' : 'No completed tasks';
            taskList.appendChild(emptyMessage);
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.priority}-priority ${task.completed ? 'completed' : ''}`;
            taskItem.dataset.id = task.id;
            
            // Check if task is overdue
            if (task.dueDate && !task.completed) {
                const dueDate = new Date(task.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (dueDate < today) {
                    taskItem.classList.add('overdue');
                }
            }
            
            // Format due date for display
            let dueDateText = '';
            if (task.dueDate) {
                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                dueDateText = new Date(task.dueDate).toLocaleDateString(undefined, options);
            }
            
            // Priority text
            const priorityText = task.priority === 'high' ? 'High Priority' : 
                               task.priority === 'low' ? 'Low Priority' : '';
            
            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                    <div class="task-details">
                        ${task.priority !== 'normal' ? `<span><i class="fas fa-flag ${task.priority === 'high' ? 'text-danger' : 'text-info'}"></i> ${priorityText}</span>` : ''}
                        ${dueDateText ? `<span><i class="far fa-calendar-alt"></i> ${dueDateText}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-edit"><i class="fas fa-edit"></i></button>
                    <button class="task-delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            const checkbox = taskItem.querySelector('.task-checkbox');
            const editBtn = taskItem.querySelector('.task-edit');
            const deleteBtn = taskItem.querySelector('.task-delete');
            const taskText = taskItem.querySelector('.task-text');
            
            // Event listeners for task actions
            checkbox.addEventListener('change', function() {
                toggleTaskComplete(task.id);
            });
            
            editBtn.addEventListener('click', function() {
                editTask(task.id, taskText);
            });
            
            deleteBtn.addEventListener('click', function() {
                deleteTask(task.id);
            });
            
            // Add double-click to edit
            taskText.addEventListener('dblclick', function() {
                editTask(task.id, taskText);
            });
            
            taskList.appendChild(taskItem);
        });
    }
    
    // Sort tasks based on the current sort option
    function sortTasks(tasksToSort) {
        switch(currentSort) {
            case 'date-added':
                // Sort by date added (newest first)
                tasksToSort.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
                break;
            case 'due-date':
                // Sort by due date (soonest first), with tasks without due dates at the end
                tasksToSort.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            case 'priority':
                // Sort by priority (high → normal → low)
                const priorityValues = { 'high': 3, 'normal': 2, 'low': 1 };
                tasksToSort.sort((a, b) => priorityValues[b.priority] - priorityValues[a.priority]);
                break;
        }
    }
    
    // Toggle task completion status
    function toggleTaskComplete(taskId) {
        tasks = tasks.map(task => {
            if (task.id === taskId) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        
        saveTasks();
        renderTasks();
        updateTaskCount();
    }
    
    // Delete a task
    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        renderTasks();
        updateTaskCount();
        showToast('Task Deleted', 'Task has been removed successfully');
    }
    
    // Edit a task
    function editTask(taskId, taskTextElement) {
        const currentTask = tasks.find(task => task.id === taskId);
        const currentText = currentTask.text;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.classList.add('edit-input');
        
        taskTextElement.replaceWith(input);
        input.focus();
        input.setSelectionRange(0, input.value.length);
        
        function saveEdit() {
            const newText = input.value.trim();
            if (newText && newText !== currentText) {
                tasks = tasks.map(task => {
                    if (task.id === taskId) {
                        return { ...task, text: newText };
                    }
                    return task;
                });
                saveTasks();
                showToast('Task Updated', 'Task text has been updated');
            }
            
            renderTasks();
        }
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                renderTasks(); // Cancel editing
            }
        });
    }
    
    // Clear all completed tasks
    function clearCompletedTasks() {
        const completedCount = tasks.filter(task => task.completed).length;
        
        if (completedCount === 0) {
            showToast('No Tasks', 'No completed tasks to clear');
            return;
        }
        
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
        updateTaskCount();
        showToast('Tasks Cleared', `${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'} cleared`);
    }
    
    // Update the task counter
    function updateTaskCount() {
        const activeTasks = tasks.filter(task => !task.completed).length;
        const totalTasks = tasks.length;
        
        if (totalTasks === 0) {
            taskCount.textContent = 'No tasks';
        } else if (activeTasks === 0 && totalTasks > 0) {
            taskCount.textContent = 'All tasks completed!';
        } else {
            taskCount.textContent = `${activeTasks} of ${totalTasks} tasks remaining`;
        }
    }
    
    // Show toast notification
    function showToast(title, message) {
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        toast.classList.add('active');
        
        // Reset progress animation
        const progress = toast.querySelector('.progress');
        progress.style.animation = 'none';
        void progress.offsetWidth; // Trigger reflow
        progress.style.animation = 'progress 4s linear forwards';
        
        // Auto close after 4 seconds
        setTimeout(() => {
            toast.classList.remove('active');
        }, 4000);
    }
    
    // Export tasks to a JSON file
    // Export tasks to a TXT file
    function exportTasks() {
        if (tasks.length === 0) {
            showToast('No Tasks', 'No tasks to export');
            return;
        }

        // Create a text string of the tasks
        let tasksText = 'TaskMaster Pro - Task Export\n';
        tasksText += `Generated on: ${new Date().toLocaleString()}\n\n`;
        tasksText += '========================================\n\n';

        tasks.forEach((task, index) => {
            tasksText += `Task ${index + 1}:\n`;
            tasksText += `- Description: ${task.text}\n`;
            tasksText += `- Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}\n`;
            tasksText += `- Status: ${task.completed ? 'Completed' : 'Pending'}\n`;
            
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                tasksText += `- Due Date: ${dueDate.toLocaleDateString()}\n`;
            }
            
            tasksText += `- Created: ${new Date(task.dateAdded).toLocaleDateString()}\n\n`;
            tasksText += '----------------------------------------\n\n';
        });

        // Create a blob and download it
        const blob = new Blob([tasksText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link and click it
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskmaster-export-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Export Complete', 'Tasks exported as TXT file');
    }
    
    // Initialize the application
    init();
});