// Global chart variable
let comparisonChart = null;

document.addEventListener('DOMContentLoaded', function () {
    const themeToggle = document.getElementById('themeToggle');

    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    // Apply the saved theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Add click event to toggle button
    themeToggle.addEventListener('click', function () {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        updateThemeIcon(newTheme);

        // If there's an active chart, refresh it with the new theme
        if (comparisonChart && document.getElementById('output').style.display !== 'none') {
            const fifoValues = comparisonChart.data.datasets[0].data;
            const lruValues = comparisonChart.data.datasets[1].data;
            const optimalValues = comparisonChart.data.datasets[2].data;

            const fifoResult = {
                name: 'FIFO',
                faults: fifoValues[0],
                hits: fifoValues[0],
                ratio: fifoValues[2]
            };

            const lruResult = {
                name: 'LRU',
                faults: lruValues[0],
                hits: lruValues[1],
                ratio: lruValues[2]
            };

            const optimalResult = {
                name: 'Optimal',
                faults: optimalValues[0],
                hits: optimalValues[1],
                ratio: optimalValues[2]
            };

            createComparisonChart(fifoResult, lruResult, optimalResult);
        }
    });

    // Update the icon based on theme
    function updateThemeIcon(theme) {
        themeToggle.innerHTML = theme === 'dark' ? '🌙' : '🔆';
    }
});

function generateRandomString() {
    // Generate a random length between 10 and 20
    const length = Math.floor(Math.random() * 11) + 10;
    // Generate random numbers between 0 and 9
    const randomPages = Array.from({ length }, () => Math.floor(Math.random() * 10));
    // Set the value in the input field
    document.getElementById("pages").value = randomPages.join(', ');
}

function runSimulation() {
    let pages = document.getElementById("pages").value
        .split(",")
        .map(p => parseInt(p.trim()));
    let frames = parseInt(document.getElementById("frames").value);

    if (!pages.length || isNaN(frames) || frames < 1) {
        alert("Please enter valid input!");
        return;
    }

    // Run all algorithms
    const fifoResult = fifo(pages, frames);
    const lruResult = lru(pages, frames);
    const optimalResult = optimal(pages, frames);

    // Display results
    displayResults(fifoResult, lruResult, optimalResult);

    // Show the output section
    document.getElementById("output").style.display = "block";
}

function fifo(pages, frames) {
    let queue = [], faults = 0, hits = 0, steps = "";
    pages.forEach((page, index) => {
        let isHit = queue.includes(page);
        if (!isHit) {
            if (queue.length < frames) {
                queue.push(page);
            } else {
                queue.shift();
                queue.push(page);
            }
            faults++;
        } else {
            hits++;
        }
        steps += renderStep(index + 1, queue, isHit, page, "FIFO");
    });
    return {
        name: "FIFO",
        faults,
        hits,
        steps,
        ratio: (hits / pages.length * 100).toFixed(2)
    };
}

function lru(pages, frames) {
    let memory = [], faults = 0, hits = 0, steps = "";
    pages.forEach((page, index) => {
        let foundIndex = memory.findIndex(item => item.value === page);
        if (foundIndex === -1) {
            faults++;
            if (memory.length === frames) {
                // Sort by time and remove least recently used
                memory.sort((a, b) => a.time - b.time);
                memory.shift();
            }
            memory.push({ value: page, time: index });
        } else {
            hits++;
            // Update the access time for the found page
            memory[foundIndex].time = index;
        }
        steps += renderStep(
            index + 1,
            memory.map(item => item.value),
            foundIndex !== -1,
            page,
            "LRU"
        );
    });
    return {
        name: "LRU",
        faults,
        hits,
        steps,
        ratio: (hits / pages.length * 100).toFixed(2)
    };
}

function optimal(pages, frames) {
    let memory = [], faults = 0, hits = 0, steps = "";
    for (let i = 0; i < pages.length; i++) {
        let page = pages[i];
        if (memory.includes(page)) {
            hits++;
            steps += renderStep(i + 1, memory, true, page, "Optimal");
            continue;
        }
        faults++;
        if (memory.length < frames) {
            memory.push(page);
        } else {
            let indexToReplace = -1, farthestUse = -1;
            memory.forEach((mPage, idx) => {
                let nextUse = pages.slice(i + 1).indexOf(mPage);
                if (nextUse === -1) {
                    indexToReplace = idx;
                    return;
                }
                if (nextUse > farthestUse) {
                    farthestUse = nextUse;
                    indexToReplace = idx;
                }
            });
            memory[indexToReplace] = page;
        }
        steps += renderStep(i + 1, memory, false, page, "Optimal");
    }
    return {
        name: "Optimal",
        faults,
        hits,
        steps,
        ratio: (hits / pages.length * 100).toFixed(2)
    };
}

function renderStep(step, currentMemory, isHit, page, algorithm) {
    return `
      <div class="step">
        <div class="step-number">Step ${step}:</div>
        ${currentMemory.map(p => `<div class="frame-box ${isHit ? 'hit' : 'miss'}">${p}</div>`).join('')}
        <div class="explanation">Page ${page} ${isHit ? "was a hit" : "caused a fault"} (${algorithm}).</div>
      </div>`;
}

function displayResults(fifoResult, lruResult, optimalResult) {
    // Display result cards
    const resultsContainer = document.getElementById("results-container");
    resultsContainer.innerHTML = `
      <div class="result-card">
        <h3>${fifoResult.name} Results</h3>
        <div class="result-stats">
          <div class="stat-item">
            <div class="stat-value">${fifoResult.faults}</div>
            <div class="stat-label">Page Faults</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${fifoResult.hits}</div>
            <div class="stat-label">Page Hits</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${fifoResult.ratio}%</div>
            <div class="stat-label">Hit Ratio</div>
          </div>
        </div>
      </div>
      
      <div class="result-card">
        <h3>${lruResult.name} Results</h3>
        <div class="result-stats">
          <div class="stat-item">
            <div class="stat-value">${lruResult.faults}</div>
            <div class="stat-label">Page Faults</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${lruResult.hits}</div>
            <div class="stat-label">Page Hits</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${lruResult.ratio}%</div>
            <div class="stat-label">Hit Ratio</div>
          </div>
        </div>
      </div>
      
      <div class="result-card">
        <h3>${optimalResult.name} Results</h3>
        <div class="result-stats">
          <div class="stat-value">${optimalResult.faults}</div>
            <div class="stat-label">Page Faults</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${optimalResult.hits}</div>
            <div class="stat-label">Page Hits</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${optimalResult.ratio}%</div>
            <div class="stat-label">Hit Ratio</div>
          </div>
        </div>
      </div>
    `;

    // Display steps side by side
    const stepsContainer = document.getElementById("steps-container");

    // Create DOM elements to parse the steps properly
    const tempFifo = document.createElement('div');
    tempFifo.innerHTML = fifoResult.steps;
    const fifoSteps = Array.from(tempFifo.querySelectorAll('.step'));

    const tempLru = document.createElement('div');
    tempLru.innerHTML = lruResult.steps;
    const lruSteps = Array.from(tempLru.querySelectorAll('.step'));

    const tempOptimal = document.createElement('div');
    tempOptimal.innerHTML = optimalResult.steps;
    const optimalSteps = Array.from(tempOptimal.querySelectorAll('.step'));

    // Determine the maximum number of steps
    const maxSteps = Math.max(fifoSteps.length, lruSteps.length, optimalSteps.length);

    // Create table headers
    let stepsHTML = `
      <div class="steps-header">
        <h4>Step-by-Step Comparison</h4>
      </div>
      <div class="steps-table">
        <div class="steps-row steps-header-row">
          <div class="steps-cell header-cell">Step</div>
          <div class="steps-cell header-cell">${fifoResult.name}</div>
          <div class="steps-cell header-cell">${lruResult.name}</div>
          <div class="steps-cell header-cell">${optimalResult.name}</div>
        </div>
    `;

    // Add each step row
    for (let i = 0; i < maxSteps; i++) {
        stepsHTML += `
        <div class="steps-row">
          <div class="steps-cell step-number-cell">Step ${i + 1}</div>
          <div class="steps-cell">${fifoSteps[i] ? extractStepContent(fifoSteps[i]) : ''}</div>
          <div class="steps-cell">${lruSteps[i] ? extractStepContent(lruSteps[i]) : ''}</div>
          <div class="steps-cell">${optimalSteps[i] ? extractStepContent(optimalSteps[i]) : ''}</div>
        </div>
      `;
    }

    stepsHTML += `</div>`;
    stepsContainer.innerHTML = stepsHTML;

    // Create comparison chart
    createComparisonChart(fifoResult, lruResult, optimalResult);
}

// Helper function to extract the content of a step
function extractStepContent(stepElement) {
    try {
        // Extract the frame boxes
        const frameBoxes = stepElement.querySelectorAll('.frame-box');
        let result = '<div class="frame-container">';

        frameBoxes.forEach(box => {
            result += box.outerHTML;
        });

        result += '</div>';

        // Extract the explanation
        const explanation = stepElement.querySelector('.explanation');
        if (explanation) {
            const explanationText = explanation.textContent.replace(/\([^)]*\)/, '').trim();
            result += `<div class="small-explanation">${explanationText}</div>`;
        }

        return result;
    } catch (error) {
        console.error("Error extracting step content:", error);
        return '';
    }
}

function createComparisonChart(fifoResult, lruResult, optimalResult) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');

    // Destroy previous chart if it exists
    if (comparisonChart) {
        comparisonChart.destroy();
    }

    // Create gradient for the line chart
    const gradientStroke = ctx.createLinearGradient(0, 0, 0, 400);
    gradientStroke.addColorStop(0, 'rgba(75, 192, 192, 0.7)');
    gradientStroke.addColorStop(1, 'rgba(75, 192, 192, 0.1)');

    // Determine if we're in dark mode
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

    // Create dynamic colors based on the current theme
    const getThemeColors = () => {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            gridColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color'),
            tooltipBg: getComputedStyle(document.documentElement).getPropertyValue('--tooltip-bg')
        };
    };

    // Get theme colors
    const themeColors = getThemeColors();

    // Configure chart
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['FIFO', 'LRU', 'Optimal'],
            datasets: [
                {
                    label: 'Page Faults',
                    data: [fifoResult.faults, lruResult.faults, optimalResult.faults],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 99, 132, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                    hoverBackgroundColor: 'rgba(255, 99, 132, 0.9)'
                },
                {
                    label: 'Page Hits',
                    data: [fifoResult.hits, lruResult.hits, optimalResult.hits],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(54, 162, 235, 0.7)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                    hoverBackgroundColor: 'rgba(54, 162, 235, 0.9)'
                },
                {
                    label: 'Hit Ratio (%)',
                    data: [fifoResult.ratio, lruResult.ratio, optimalResult.ratio],
                    backgroundColor: gradientStroke,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 3,
                    type: 'line',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'white',
                    pointBorderColor: 'rgba(75, 192, 192, 1)',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 15,
                        padding: 15,
                        font: {
                            size: 13,
                            family: "'Roboto', sans-serif"
                        },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color'),
                    }
                },
                tooltip: {
                    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--tooltip-bg'),
                    titleFont: {
                        size: 14,
                        family: "'Roboto', sans-serif",
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13,
                        family: "'Roboto', sans-serif"
                    },
                    padding: 12,
                    cornerRadius: 8,
                    caretSize: 8,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.label === 'Hit Ratio (%)') {
                                label += context.raw + '%';
                            } else {
                                label += context.raw;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        color: themeColors.gridColor
                    },
                    ticks: {
                        font: {
                            family: "'Roboto', sans-serif"
                        },
                        color: themeColors.textColor
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: themeColors.gridColor,
                        lineWidth: 1
                    },
                    title: {
                        display: true,
                        text: 'Count',
                        font: {
                            weight: 'bold',
                            size: 13,
                            family: "'Roboto', sans-serif"
                        },
                        color: themeColors.textColor
                    },
                    ticks: {
                        font: {
                            family: "'Roboto', sans-serif"
                        },
                        color: themeColors.textColor
                    }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        drawOnChartArea: false,
                        color: themeColors.gridColor,
                        lineWidth: 1
                    },
                    title: {
                        display: true,
                        text: 'Hit Ratio (%)',
                        font: {
                            weight: 'bold',
                            size: 13,
                            family: "'Roboto', sans-serif"
                        },
                        color: themeColors.textColor
                    },
                    ticks: {
                        font: {
                            family: "'Roboto', sans-serif"
                        },
                        color: themeColors.textColor,
                        callback: function (value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}