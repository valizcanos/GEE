// Cargar paises:

var paises = ee.FeatureCollection("FAO/GAUL/2015/level2");

var geometria = paises.filter(ee.Filter.eq('ADM0_NAME', 'Colombia'));

// Cargar la colección de imágenes de Landsat
var landsat = ee.ImageCollection('LANDSAT/LC08/C01/T1_TOA')
              .filterDate('2019-01-01', '2019-12-31')
              .filterBounds(geometria);

// Calcular el índice NDVI

function Crearndvi(img){
  var ndvi = img.expression(
    "(B5-B4)/(B5+B4)",
    {"B5": img.select("B5"),
      "B4": img.select("B4")
    }
  ).rename("NDVI").copyProperties(img, ['system:time_start']);
  return img.addBands(ndvi);
}
var landsat = landsat.map(Crearndvi);

// Calcular la temperatura de la superficie del suelo (LST)

function Crearlst(img){
  var lst = img.select('B10').multiply(0.1).rename("LST");
  return img.addBands(lst);
}

var landsat = landsat.map(Crearlst);

// Calcular el VHI utilizando la función expression

function calcularVCI(img){
  var vci = img.expression(
  "((ndvi-ndvimin)/(ndvimax-ndvimin))*100",
  {"ndvi": img.select("NDVI"),
    "ndvimin": img.reduce(ee.Reducer.min()),
    "ndvimax": img.reduce(ee.Reducer.max())
  }).rename("VCI").copyProperties(img, ['system:time_start']);
  return img.addBands(vci);
}

function calcularTCI(img){
  var tci = img.expression(
  "((lstmax-lst)/(lstmax-lstmin))*100",
  {"lst": img.select("LST"),
    "lstmin": img.reduce(ee.Reducer.min()),
    "lstmax": img.reduce(ee.Reducer.max())
  }).rename("TCI").copyProperties(img, ['system:time_start']);
  return img.addBands(tci);
}

function calcularVHI(img){
  var vhi = img.expression(
    "(0.5*VCI)+(0.5*TCI)",{
      "VCI": img.select("VCI"),
      "TCI": img.select("TCI")
    }
    ).rename("VHI").copyProperties(img,["system:time_start"]);
  return img.addBands(vhi);
}

var landsat = landsat.map(calcularVCI);
var landsat = landsat.map(calcularTCI);
var landsat = landsat.map(calcularVHI);

// Visualizar el VHI
Map.centerObject(geometria,5);
Map.addLayer(landsat.select("VHI").mean(), {min: 20, max: 70, palette: ['brown', 'green', 'darkgreen']}, 'VHI');
