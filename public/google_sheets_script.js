/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: Ежедневный накопительный сбор дельты и цен с сайта MOEX
 * Источник данных: https://impersonal-transactions.onrender.com/
 * 
 * ВАЖНО: Перед вставкой нажмите Ctrl+A и Delete, чтобы полностью очистить файл Код.gs!
 * =========================================================================================
 */

var BASE_URL = 'https://impersonal-transactions.onrender.com';

// Список отслеживаемых инструментов по умолчанию (Акции TQBR и Фьючерсы FORTS)
var DEFAULT_INSTRUMENTS = [
  // Фьючерсы FORTS
  { ticker: 'CNYRUBF', market: 'futures', name: 'Вечный юань-рубль' },
  { ticker: 'SiZ6', market: 'futures', name: 'USD/RUB Si-12.26' },
  { ticker: 'CRZ6', market: 'futures', name: 'CNY/RUB CR-12.26' },
  { ticker: 'RIZ6', market: 'futures', name: 'Индекс РТС' },
  { ticker: 'BRF7', market: 'futures', name: 'Brent Oil' },
  { ticker: 'NGX6', market: 'futures', name: 'Природный газ' },
  { ticker: 'GDZ6', market: 'futures', name: 'Золото' },
  { ticker: 'SRZ6', market: 'futures', name: 'Сбер фьючерс' },
  { ticker: 'GZZ6', market: 'futures', name: 'Газпром фьючерс' },

  // Акции TQBR
  { ticker: 'SBER', market: 'stocks', name: 'Сбербанк' },
  { ticker: 'GAZP', market: 'stocks', name: 'Газпром' },
  { ticker: 'LKOH', market: 'stocks', name: 'Лукойл' },
  { ticker: 'YDEX', market: 'stocks', name: 'Яндекс' },
  { ticker: 'GMKN', market: 'stocks', name: 'Норникель' },
  { ticker: 'ROSN', market: 'stocks', name: 'Роснефть' },
  { ticker: 'VTBR', market: 'stocks', name: 'ВТБ' },
  { ticker: 'NVTK', market: 'stocks', name: 'Новатэк' },
  { ticker: 'PLZL', market: 'stocks', name: 'Полюс Золото' },
  { ticker: 'TATN', market: 'stocks', name: 'Татнефть' },
  { ticker: 'MGNT', market: 'stocks', name: 'Магнит' },
  { ticker: 'OZON', market: 'stocks', name: 'ОЗОН' },
  { ticker: 'T', market: 'stocks', name: 'Т-Технологии' },
  { ticker: 'MOEX', market: 'stocks', name: 'Московская Биржа' },
  { ticker: 'ALRS', market: 'stocks', name: 'АЛРОСА' }
];

/**
 * Создание пользовательского меню при открытии таблицы
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('MOEX Дельта')
      .addItem('Собрать данные за день (Все тикеры)', 'fetchMoexDeltaDaily')
      .addItem('Настроить авто-запуск в 23:55 МСК', 'setupDailyTrigger2355MSK')
      .addItem('Создать листы для всех тикеров', 'initAllTickerSheets')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen: ' + e.toString());
  }
}

/**
 * Главная функция: сбор суточных данных по всем тикерам и добавление новой строки в каждый лист
 */
function fetchMoexDeltaDaily() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Получаем актуальный список инструментов с сайта или берем резервный
  var instruments = DEFAULT_INSTRUMENTS;
  try {
    var listRes = UrlFetchApp.fetch(BASE_URL + '/api/moex/instruments-list', { muteHttpExceptions: true });
    if (listRes.getResponseCode() === 200) {
      var listData = JSON.parse(listRes.getContentText());
      if (listData.instruments && listData.instruments.length > 0) {
        instruments = listData.instruments.map(function(item) {
          return {
            ticker: item.secId,
            market: item.market,
            name: item.shortName || item.name
          };
        });
      }
    }
  } catch (e) {
    Logger.log('Резервный список инструментов: ' + e.toString());
  }

  // 2. Обновляем сводный дашборд
  updateSummaryDashboard(ss, instruments);

  // 3. Добавляем суточную строку и обновляем график накопления для каждого тикера
  for (var i = 0; i < instruments.length; i++) {
    var inst = instruments[i];
    try {
      Logger.log('Опрос тикера ' + inst.ticker + ' (' + inst.market + ')...');
      appendDailyRowAndChart(ss, inst);
      Utilities.sleep(300); // пауза 300мс для стабильности
    } catch (err) {
      Logger.log('Ошибка по ' + inst.ticker + ': ' + err.toString());
    }
  }

  try {
    ss.toast('Ежедневные данные и графики накопления успешно обновлены!', 'Готово', 5);
  } catch (e) {}
}

/**
 * Запись одной строки данных за день и построение графика накопления данных
 */
function appendDailyRowAndChart(ss, inst) {
  var url = BASE_URL + '/api/moex/report?ticker=' + encodeURIComponent(inst.ticker) + '&market=' + encodeURIComponent(inst.market) + '&session=all';

  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'GoogleAppsScript-MOEX-DailyPoller/2.0'
    }
  });

  if (response.getResponseCode() !== 200) {
    Logger.log('Ошибка HTTP ' + response.getResponseCode() + ' для ' + inst.ticker);
    return;
  }

  var data = JSON.parse(response.getContentText());
  var ticker = String(inst.ticker).toUpperCase();

  // Ищем или создаем лист тикера
  var sheet = ss.getSheetByName(ticker);
  if (!sheet) {
    sheet = ss.insertSheet(ticker);
    initTickerSheet(sheet, ticker, inst.name, inst.market);
  }

  // 1. Извлекаем показатели за день торгов
  var tradingDate = data.tradingDate || Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd');
  var openPrice = data.openPrice || data.firstPrice || (data.lastPrice - (data.priceChange || 0)) || data.lastPrice || 0;
  var closePrice = data.closePrice || data.lastPrice || 0;
  var priceChangePct = data.priceChangePct !== undefined ? (data.priceChangePct / 100) : (openPrice > 0 ? ((closePrice - openPrice) / openPrice) : 0);
  var netDeltaRub = data.netDeltaRub || 0;
  var buyValueRub = data.buyValueRub || 0;
  var sellValueRub = data.sellValueRub || 0;
  var totalTurnoverRub = data.totalTurnoverRub || (buyValueRub + sellValueRub);
  var nowMsk = Utilities.formatDate(new Date(), 'Europe/Moscow', 'HH:mm:ss (dd.MM.yyyy)');

  // 2. Проверяем, есть ли уже запись за эту дату (чтобы обновить или добавить новую строку)
  var lastRow = sheet.getLastRow();
  var existingRow = -1;
  var prevAccumulatedDelta = 0;

  if (lastRow >= 5) {
    var dates = sheet.getRange(5, 1, lastRow - 4, 1).getValues();
    for (var r = 0; r < dates.length; r++) {
      var cellVal = dates[r][0];
      var cellDateStr = cellVal instanceof Date 
        ? Utilities.formatDate(cellVal, 'Europe/Moscow', 'yyyy-MM-dd') 
        : String(cellVal).trim();
      if (cellDateStr === tradingDate) {
        existingRow = r + 5;
        break;
      }
    }

    // Получаем предыдущую накопленную дельту (колонка 9 = I)
    var prevRowIdx = existingRow !== -1 ? existingRow - 1 : lastRow;
    if (prevRowIdx >= 5) {
      var prevVal = sheet.getRange(prevRowIdx, 9).getValue();
      if (typeof prevVal === 'number' && !isNaN(prevVal)) {
        prevAccumulatedDelta = prevVal;
      }
    }
  }

  var accumulatedDelta = prevAccumulatedDelta + netDeltaRub;

  // Формируем ОДНУ строку со всеми запрошенными метриками:
  // 1: Дата
  // 2: Цена открытия (₽)
  // 3: Цена закрытия (₽)
  // 4: Изменение цены (%)
  // 5: Чистая дельта (₽)
  // 6: Объем покупок (₽)
  // 7: Объем продаж (₽)
  // 8: Общий оборот дня (₽)
  // 9: Накопительная дельта (₽)
  // 10: Время фиксации (МСК)
  var rowValues = [
    tradingDate,
    openPrice,
    closePrice,
    priceChangePct,
    netDeltaRub,
    buyValueRub,
    sellValueRub,
    totalTurnoverRub,
    accumulatedDelta,
    nowMsk
  ];

  var targetRow = existingRow;
  if (existingRow !== -1) {
    // Обновляем существующую строку за сегодня
    sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    // Добавляем НОВУЮ строку на каждый день
    sheet.appendRow(rowValues);
    targetRow = sheet.getLastRow();
  }

  // Применяем красивое форматирование строки
  sheet.getRange(targetRow, 1).setHorizontalAlignment('center');
  sheet.getRange(targetRow, 2, 1, 2).setNumberFormat('#,##0.00 "₽"');
  sheet.getRange(targetRow, 4).setNumberFormat('+0.00%;-0.00%;0.00%').setHorizontalAlignment('center');
  sheet.getRange(targetRow, 5).setNumberFormat('+#,##0.00 "₽";-#,##0.00 "₽";0.00 "₽"');
  sheet.getRange(targetRow, 6, 1, 3).setNumberFormat('#,##0.00 "₽"');
  sheet.getRange(targetRow, 9).setNumberFormat('+#,##0.00 "₽";-#,##0.00 "₽";0.00 "₽"');
  sheet.getRange(targetRow, 10).setHorizontalAlignment('center');

  // Подсветка дельты и изменения цены
  var deltaCell = sheet.getRange(targetRow, 5);
  if (netDeltaRub >= 0) {
    deltaCell.setFontColor('#15803d').setFontWeight('bold');
  } else {
    deltaCell.setFontColor('#b91c1c').setFontWeight('bold');
  }

  var changeCell = sheet.getRange(targetRow, 4);
  if (priceChangePct >= 0) {
    changeCell.setFontColor('#15803d');
  } else {
    changeCell.setFontColor('#b91c1c');
  }

  // 3. Строим или обновляем График накопления данных рядом с таблицей
  updateAccumulationChart(sheet, ticker);
}

/**
 * Инициализация шапки листа тикера
 */
function initTickerSheet(sheet, ticker, name, market) {
  var marketTitle = market === 'stocks' ? 'Акции TQBR' : 'Фьючерсы FORTS';

  sheet.getRange('A1').setValue(ticker + ' · ' + (name || '') + ' (' + marketTitle + ')')
    .setFontSize(14).setFontWeight('bold').setFontColor('#0f172a');
  sheet.getRange('A2').setValue('Ежедневный накопительный реестр дельты и цен · Фиксация каждый день в 23:55 МСК')
    .setFontSize(10).setFontColor('#475569').setFontStyle('italic');

  var headers = [
    'Дата торгов',
    'Цена открытия (₽)',
    'Цена закрытия (₽)',
    'Изм. цены (%)',
    'Чистая Дельта (₽)',
    'Объем покупок (₽)',
    'Объем продаж (₽)',
    'Общий оборот (₽)',
    'Накопительная Дельта (₽)',
    'Время фиксации (МСК)'
  ];

  var headerRange = sheet.getRange(4, 1, 1, headers.length);
  headerRange.setValues([headers])
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(4);

  // Настройка оптимальной ширины колонок таблицы
  sheet.setColumnWidth(1, 105);
  sheet.setColumnWidth(2, 125);
  sheet.setColumnWidth(3, 125);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 145);
  sheet.setColumnWidth(6, 135);
  sheet.setColumnWidth(7, 135);
  sheet.setColumnWidth(8, 145);
  sheet.setColumnWidth(9, 160);
  sheet.setColumnWidth(10, 150);
  sheet.setColumnWidth(11, 20); // отступ перед графиком
}

/**
 * Построение/обновление графика накопления данных рядом с таблицей
 */
function updateAccumulationChart(sheet, ticker) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 5) return; // нет данных для графика

  // Удаляем старые графики на этом листе
  var charts = sheet.getCharts();
  for (var i = 0; i < charts.length; i++) {
    sheet.removeChart(charts[i]);
  }

  var numRows = lastRow - 3; // строки с заголовком (строка 4) до lastRow

  // Диапазон 1: Дата (Колонка A)
  var dateRange = sheet.getRange(4, 1, numRows, 1);
  // Диапазон 2: Цена закрытия (Колонка C)
  var priceRange = sheet.getRange(4, 3, numRows, 1);
  // Диапазон 3: Накопительная Дельта (Колонка I)
  var cumDeltaRange = sheet.getRange(4, 9, numRows, 1);

  // Создаем двухшкальный график накопления данных
  var chart = sheet.newChart()
    .asLineChart()
    .addRange(dateRange)
    .addRange(priceRange)
    .addRange(cumDeltaRange)
    .setPosition(4, 12, 10, 0) // Размещаем справа в колонке L рядом с таблицей
    .setOption('title', ticker + ' · График накопления дельты и динамики цены по дням')
    .setOption('width', 760)
    .setOption('height', 400)
    .setOption('legend', { position: 'top' })
    .setOption('useFirstRowAsHeaders', true)
    .setOption('series', {
      0: { targetAxisIndex: 0, color: '#0284c7', lineWidth: 2, labelInLegend: 'Цена закрытия (₽)' },
      1: { targetAxisIndex: 1, color: '#10b981', lineWidth: 3, labelInLegend: 'Накопленная Дельта (₽)' }
    })
    .setOption('vAxes', {
      0: { title: 'Цена (₽)', textStyle: { color: '#0284c7' } },
      1: { title: 'Накопленная Дельта (₽)', textStyle: { color: '#10b981' } }
    })
    .setOption('hAxis', {
      title: 'Дата торгового дня',
      slantedText: true,
      slantedTextAngle: 30
    })
    .build();

  sheet.insertChart(chart);
}

/**
 * Создание сводной таблицы со статусом тикеров
 */
function updateSummaryDashboard(ss, instruments) {
  var sheet = ss.getSheetByName('СВОДКА_ДЕЛЬТЫ');
  if (!sheet) {
    sheet = ss.insertSheet('СВОДКА_ДЕЛЬТЫ', 0);
  }

  sheet.getRange('A1').setValue('МОСКОВСКАЯ БИРЖА (MOEX) · Сводка Накопления Дельты')
    .setFontSize(14).setFontWeight('bold').setFontColor('#0f172a');
  sheet.getRange('A2').setValue('Авто-фиксация каждый день в 23:55 МСК · Источник: ' + BASE_URL)
    .setFontSize(10).setFontColor('#64748b');

  var headers = ['Тикер', 'Рынок', 'Наименование', 'Лист в таблице', 'Статус'];
  sheet.getRange(4, 1, 1, headers.length).setValues([headers])
    .setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');

  for (var i = 0; i < instruments.length; i++) {
    var rowNum = 5 + i;
    sheet.getRange(rowNum, 1).setValue(instruments[i].ticker).setFontWeight('bold');
    sheet.getRange(rowNum, 2).setValue(instruments[i].market === 'stocks' ? 'Акции (TQBR)' : 'Фьючерсы (FORTS)');
    sheet.getRange(rowNum, 3).setValue(instruments[i].name || '');
    sheet.getRange(rowNum, 4).setValue(instruments[i].ticker);
    sheet.getRange(rowNum, 5).setValue('Синхронизирован');
  }

  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 160);
  sheet.setColumnWidth(5, 140);
}

/**
 * Инициализация всех листов тикеров сразу
 */
function initAllTickerSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var i = 0; i < DEFAULT_INSTRUMENTS.length; i++) {
    var inst = DEFAULT_INSTRUMENTS[i];
    var sheet = ss.getSheetByName(inst.ticker);
    if (!sheet) {
      sheet = ss.insertSheet(inst.ticker);
      initTickerSheet(sheet, inst.ticker, inst.name, inst.market);
    }
  }
  updateSummaryDashboard(ss, DEFAULT_INSTRUMENTS);
  try {
    ss.toast('Все вкладки тикеров созданы!', 'Готово', 4);
  } catch (e) {}
}

/**
 * Настройка ежедневного автоматического запуска в 23:55 МСК
 */
function setupDailyTrigger2355MSK() {
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === 'fetchMoexDeltaDaily') {
      ScriptApp.deleteTrigger(allTriggers[i]);
    }
  }

  // Создаем триггер на 23:55 по часовому поясу Москвы (Europe/Moscow)
  ScriptApp.newTrigger('fetchMoexDeltaDaily')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .nearMinute(55)
    .inTimezone('Europe/Moscow')
    .create();

  try {
    SpreadsheetApp.getUi().alert(
      'Триггер установлен!',
      'Скрипт будет автоматически запускаться каждый день в 23:55 по Московскому времени (UTC+3), добавляя новую строку в таблицу каждого тикера и обновляя график накопления данных.\n\nВы также можете запускать опрос вручную в любое время через меню "MOEX Дельта" -> "Собрать данные за день".',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    Logger.log('Триггер установлен успешно!');
  }
}
