// Глобальная переменная для курсов валют
let exchangeRates = {
    usd: 80.1914,
    eur: 93.0072,
    rub: 1,
    cny: 12.5,
    jpy: 0.54
};

// Функция загрузки курсов валют
async function loadExchangeRates() {
    try {
        const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
        const data = await response.json();
        
        // Обновляем курсы
        const newRates = {
            usd: data.Valute.USD.Value,
            eur: data.Valute.EUR.Value,
            rub: 1,
            cny: data.Valute.CNY.Value,
            jpy: data.Valute.JPY.Value / 100  // курс за 1 йену (в ЦБ за 100 йен)
        };

        // Сохраняем в localStorage с текущей датой
        const storageData = {
            rates: newRates,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('exchangeRates', JSON.stringify(storageData));

        // Обновляем глобальную переменную
        exchangeRates = newRates;
    } catch (error) {
        console.error('Ошибка загрузки курсов валют:', error);
        // При ошибке используем сохраненные данные
        const saved = localStorage.getItem('exchangeRates');
        if (saved) {
            try {
                const savedData = JSON.parse(saved);
                exchangeRates = savedData.rates;
            } catch (e) {
                console.error('Ошибка парсинга сохраненных курсов:', e);
            }
        }
    }
}

// Проверяем и обновляем курсы при загрузке страницы
function initExchangeRates() {
    const saved = localStorage.getItem('exchangeRates');
    if (saved) {
        try {
            const savedData = JSON.parse(saved);
            const now = new Date().getTime();
            const oneDay = 24 * 60 * 60 * 1000; // одни сутки в миллисекундах

            // Если прошло меньше суток, используем сохраненные
            if (now - savedData.timestamp < oneDay) {
                exchangeRates = savedData.rates;
                return;
            }
        } catch (e) {
            console.error('Ошибка при чтении курсов из localStorage:', e);
        }
    }

    // Если нет сохраненных или они устарели, загружаем новые
    loadExchangeRates();
}

// Основная функция расчета
function calculateCustomsFees(e) {
    e.preventDefault();
    
    try {
        // Получаем значения из формы
        const cost = parseInputNumber(document.getElementById('cost_f').value);
        const power = parseInputNumber(document.getElementById('power_f').value);
        
        const ageElement = document.querySelector('input[name="age"]:checked');
        const engineTypeElement = document.querySelector('input[name="engine_type"]:checked');
        const currencyElement = document.querySelector('select[name="currency"]');
        const powerEdizmElement = document.querySelector('input[name="power_edizm"]:checked');
        
        // Проверка на наличие элементов
        if (!ageElement || !engineTypeElement || !currencyElement || !powerEdizmElement) {
            throw new Error('Не все поля формы заполнены');
        }
        
        const age = ageElement.value;
        const engineType = engineTypeElement.value;
        const currency = currencyElement.value;
        const powerEdizm = powerEdizmElement.value;
        
        // Конвертируем стоимость в рубли
        const costInRub = cost * exchangeRates[currency];
        const costInEuro = costInRub / exchangeRates.eur;
        
        // Переводим мощность в лошадиные силы, если указана в кВт
        let powerInLS = power;
        if (powerEdizm === 'kvt') {
            powerInLS = power * 1.35962;
        }
        
        // Базовые ставки
        let dutyRate = 0;
        let excise = 0;  // Акциз
        let vat = 0;     // НДС
        
        // Функция определения стоимости оформления по таблице
        function getCustomsClearance(cost) {
            if (cost <= 200000) {
                return 1067;
            } else if (cost <= 450000) {
                return 2134;
            } else if (cost <= 1200000) {
                return 4269;
            } else if (cost <= 2700000) {
                return 11746;
            } else if (cost <= 4200000) {
                return 16524;
            } else if (cost <= 5500000) {
                return 21344;
            } else if (cost <= 7000000) {
                return 27540;
            } else {
                return 30000;
            }
        }
        
        const customsClearance = getCustomsClearance(costInRub);
        
        // Расчет утилизационного сбора с учетом возраста ТС
        let recyclingFeeCoefficient;
        let volume = 0;
        
        if (engineType === 'electric') {
            // Для электромобилей
            recyclingFeeCoefficient = (age === '3') ? 0.17 : 0.26;
        } else {
            // Для бензиновых автомобилей
            volume = parseInputNumber(document.getElementById('volume_f').value);
            if (volume === 0) {
                throw new Error('Для бензинового автомобиля укажите объем двигателя');
            }
            
            if (age === '3') {
                // Для автомобилей младше 3 лет
                if (volume > 3500) {
                    recyclingFeeCoefficient = 137.11;
                } else if (volume > 3000) {
                    recyclingFeeCoefficient = 107.67;
                } else {
                    recyclingFeeCoefficient = 0.17;
                }
            } else {
                // Для автомобилей старше 3 лет
                if (volume > 3500) {
                    recyclingFeeCoefficient = 180.24;
                } else if (volume > 3000) {
                    recyclingFeeCoefficient = 164.84;
                } else {
                    recyclingFeeCoefficient = 0.26;
                }
            }
        }
        
        const recyclingFee = Math.round(20000 * recyclingFeeCoefficient);
        
        // Расчет таможенной пошлины и дополнительных сборов для электромобилей
        if (engineType === 'electric') {
            // Фиксированная ставка 15% для электромобилей
            dutyRate = costInRub * 0.15;
            
            // Расчет акциза по мощности двигателя
            if (powerInLS <= 90) {
                excise = 0;
            } else if (powerInLS <= 150) {
                excise = powerInLS * 61;
            } else if (powerInLS <= 200) {
                excise = powerInLS * 583;
            } else if (powerInLS <= 300) {
                excise = powerInLS * 955;
            } else if (powerInLS <= 400) {
                excise = powerInLS * 1628;
            } else if (powerInLS <= 500) {
                excise = powerInLS * 1685;
            } else {
                excise = powerInLS * 1740;
            }
            
            // Расчет НДС (20% от суммы: стоимость + пошлина + акциз)
            vat = 0.2 * (costInRub + dutyRate + excise);
        } else {
            // Расчет пошлины для бензиновых транспортных средств
            if (age === '3') {
                // Прогрессивная шкала для авто младше 3 лет
                let percentage, minRatePerCC;
                
                if (costInEuro <= 8500) {
                    percentage = 54;
                    minRatePerCC = 2.5;
                } else if (costInEuro <= 16700) {
                    percentage = 48;
                    minRatePerCC = 3.5;
                } else if (costInEuro <= 42300) {
                    percentage = 48;
                    minRatePerCC = 5.5;
                } else if (costInEuro <= 84500) {
                    percentage = 48;
                    minRatePerCC = 7.5;
                } else if (costInEuro <= 169000) {
                    percentage = 48;
                    minRatePerCC = 15;
                } else {
                    percentage = 48;
                    minRatePerCC = 20;
                }
                
                const dutyByCost = costInEuro * (percentage / 100);
                const dutyByVolume = volume * minRatePerCC;
                dutyRate = Math.max(dutyByCost, dutyByVolume) * exchangeRates.eur;
                
            } else {
                // Для автомобилей старше 3 лет
                let ratePerCC;
                
                // Определяем возрастную группу
                const isOver5Years = (age === '57' || age === '7');
                
                // Определяем ставку по объему двигателя
                if (volume <= 1000) {
                    ratePerCC = isOver5Years ? 3.0 : 1.5;
                } else if (volume <= 1500) {
                    ratePerCC = isOver5Years ? 3.2 : 1.7;
                } else if (volume <= 1800) {
                    ratePerCC = isOver5Years ? 3.5 : 2.5;
                } else if (volume <= 2300) {
                    ratePerCC = isOver5Years ? 4.8 : 2.7;
                } else if (volume <= 3000) {
                    ratePerCC = isOver5Years ? 5.0 : 3.0;
                } else {
                    ratePerCC = isOver5Years ? 5.7 : 3.6;
                }
                
                dutyRate = volume * ratePerCC * exchangeRates.eur;
            }
        }
        
        // Округление
        const customsDuty = Math.round(dutyRate);
        excise = Math.round(excise);
        vat = Math.round(vat);
        
        // Итоговая сумма
        const total = customsDuty + excise + vat + recyclingFee + customsClearance;
        
        // Форматируем курсы для отображения (4 знака после запятой)
        const formatRate = (rate) => rate.toFixed(4).replace('.', ',');
        
        // Формируем список валют для отображения
        const currenciesToShow = ['eur', 'usd'];
        if (!currenciesToShow.includes(currency)) {
            currenciesToShow.push(currency);
        }
        
        // Форматируем курсы для выбранных валют
        const rateStrings = currenciesToShow.map(curr => {
            return `${curr.toUpperCase()}: ${formatRate(exchangeRates[curr])}`;
        });
        
        const ratesDisplay = rateStrings.join(', ');
        
        // Отображение результатов
        document.getElementById('exchange_rates_used').textContent = ratesDisplay;
        document.getElementById('customs_duty').textContent = customsDuty.toLocaleString('ru-RU');
        document.getElementById('excise_tax').textContent = excise.toLocaleString('ru-RU');
        document.getElementById('vat_tax').textContent = vat.toLocaleString('ru-RU');
        document.getElementById('recycling_fee').textContent = recyclingFee.toLocaleString('ru-RU');
        document.getElementById('customs_clearance').textContent = customsClearance.toLocaleString('ru-RU');
        document.getElementById('total_amount').textContent = total.toLocaleString('ru-RU');
        
        // Показываем блок с результатами
        document.getElementById('auto_res_div').style.display = 'block';
        document.getElementById('auto_res_div').scrollIntoView({behavior: 'smooth'});
        
    } catch (error) {
        console.error('Ошибка расчета:', error);
        alert('Ошибка при расчете: ' + error.message);
    }
}

// Вспомогательная функция для парсинга чисел
function parseInputNumber(value) {
    if (!value) return 0;
    // Заменяем запятые на точки и удаляем пробелы
    const cleanedValue = value.toString().replace(/,/g, '.').replace(/\s/g, '');
    const parsed = parseFloat(cleanedValue);
    return isNaN(parsed) ? 0 : parsed;
}

// Управление полем объема двигателя
function toggleVolumeInput() {
    const isElectric = document.querySelector('input[name="engine_type"]:checked').value === 'electric';
    const volumeInput = document.getElementById('volume_f');
    
    volumeInput.disabled = isElectric;
    if (isElectric) {
        volumeInput.value = '';
    }
}

// Инициализация калькулятора
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем курсы валют
    initExchangeRates();
    
    const calcForm = document.getElementById('calc');
    if (calcForm) {
        calcForm.addEventListener('submit', calculateCustomsFees);
    }
    
    // Управление полем объема
    const engineTypeRadios = document.querySelectorAll('input[name="engine_type"]');
    engineTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleVolumeInput);
    });
    
    // Инициализация состояния поля объема
    toggleVolumeInput();
    
    // Валидация числовых полей
    const numberInputs = document.querySelectorAll('input[type="text"]');
    numberInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Разрешаем числа, точки и запятые
            this.value = this.value.replace(/[^0-9,.]/g, '');
        });
    });
});