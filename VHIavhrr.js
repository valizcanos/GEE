//VHI CON AVHRR

var NOAAndvi = ee.ImageCollection("NOAA/CDR/AVHRR/NDVI/V5");
var NOAAlst = ee.ImageCollection("NOAA/CDR/AVHRR/SR/V5");

// Cargar paises:

var paises = ee.FeatureCollection("FAO/GAUL/2015/level2");

var geometry = paises.filter(ee.Filter.eq('ADM0_NAME', 'Colombia'));

//CORTAR IMAGENES POR MASCARA

function clipImgCol(img) {
  var clipped = img.clip(geometry);
  return clipped;
}

function calcularNDVI(img) {
  var ndvi = img.select("NDVI").multiply(0.0001);
  return ndvi.copyProperties(img, ['system:time_start']);
}

var canal = "BT_CH4";
//var canal = "BT_CH5";

function calcularTS(img) {
  var ts = img.select(canal).multiply(0.1).subtract(273);
  return ts.copyProperties(img, ['system:time_start']);
}

// COLECCIONES

var NDVI = NOAAndvi.select("NDVI").filterDate('1985-01-01', '2022-12-31')
    .filterBounds(geometry).map(clipImgCol);
    
var LST = NOAAlst.select(canal).filterDate('1985-01-01', '2022-12-31')
    .filterBounds(geometry).map(clipImgCol);

var NDVI = NDVI.map(calcularNDVI);
var LST = LST.map(calcularTS);

// Rangos de fechas

var startyear = 1985;
var endyear = 2021;

var startdate = ee.Date.fromYMD(startyear, 1, 1);
var enddate = ee.Date.fromYMD(endyear + 1, 1, 1);

var years = ee.List.sequence(startyear, endyear);

var months = ee.List.sequence(1, 12);

//************************************************************************//
//*****************CALCULATAR NDVI MENSUAL ***********************//

var monthlyNdvi =  ee.ImageCollection.fromImages(
  years.map(function (y) {
    return months.map(function(m) {
      var w = NDVI.filter(ee.Filter.calendarRange(y, y, 'year'))
                    .filter(ee.Filter.calendarRange(m, m, 'month'))
                    .mean();
      return w.set('year', y)
              .set('month', m)
              .set('system:time_start', ee.Date.fromYMD(y, m, 1));
 
    });
  }).flatten()
);

print("NDVI promedio mensuales: ", monthlyNdvi);

//************************************************************************//
//*****************CALCULATAR LST MENSUAL ***********************//

var monthlyLst =  ee.ImageCollection.fromImages(
  years.map(function (y) {
    return months.map(function(m) {
      var w = LST.filter(ee.Filter.calendarRange(y, y, 'year'))
                    .filter(ee.Filter.calendarRange(m, m, 'month'))
                    .mean();
      return w.set('year', y)
              .set('month', m)
              .set('system:time_start', ee.Date.fromYMD(y, m, 1));
 
    });
  }).flatten()
);

print("LST promedio mensuales: ", monthlyLst);

//***********************************************************************//
//***********************CALCULAR VCI MENSUAL***************************//

var ndviMax = monthlyNdvi.select("NDVI").max();
var ndviMin = monthlyNdvi.select("NDVI").min();

function vci(img){
  
  var VCI =(img.subtract(ndviMin).divide(ndviMax.subtract(ndviMin))).multiply(100).rename('VCI').copyProperties(img, ['system:time_start']);
  return img.addBands(VCI);

}

var VCI = monthlyNdvi.select("NDVI").map(vci);
print("VCI : ", VCI);

//***********************************************************************//
//***********************CALCULAR TCI MENSUAL***************************//

var lstMax = monthlyLst.select("BT_CH4").max();
var lstMin = monthlyLst.select("BT_CH4").min();

function tci(img){

  var TCI =(((img.multiply(-1).add(lstMax)).divide(lstMax.subtract(lstMin))).multiply(100)).rename('TCI').copyProperties(img, ['system:time_start']);
  return img.addBands(TCI);
}

var TCI = monthlyLst.select("BT_CH4").map(tci);
print("TCI : ", TCI);

//***********************************************************************//
//***********************CALCULAR VHI MENSUAL***************************//

var Indices = VCI.combine(TCI);

var Indices = Indices.sort('system:time_start');

print("Indices : ", Indices);

function vhi(img){
  var VHI = (img.select("VCI").multiply(0.5)).add(img.select("TCI").multiply(0.5)).rename('VHI').copyProperties(img, ['system:time_start']);
  return img.addBands(VHI);
}

var VHI = Indices.map(vhi);

print("VHI : ", VHI);

//Visualizar VHI

Map.centerObject(geometry,4);
Map.addLayer(VHI.select("VHI"),{}, "VHI");
