# Analytical Methodology Document

## Mapping and Integration of Nationwide EV Charger Installations Based on Vehicle Population Using VAHAN Data

**Project:** Data-driven national platform for EV charging-infrastructure planning  
**Prototype geography:** Uttar Pradesh, with national scalability  
**Prepared for:** MHI, ICAT, State Governments, DISCOMs, and Charge Point Operators  

---

## 1. Executive Summary

India’s EV charging infrastructure is expanding through government agencies, public-sector entities, charge point operators, utilities, and private companies. However, charger information is fragmented across multiple applications and databases. This makes it difficult to understand whether charging availability is aligned with EV adoption across states, districts, cities, and transport corridors.

This project integrates EV vehicle-registration analytics from VAHAN/Parivahan with public charging-station data from BEE EV Yatra, Open Charge Map, CPO APIs, and government GIS feeds. The platform creates a unified geospatial view of EV demand and public charging supply, identifies underserved areas, estimates current and future charging requirements, and supports evidence-based infrastructure planning.

The methodology uses a transparent Gap Score combining EVs per charger, coverage deficit, socio-economic demand, and highway-corridor deficit. It also estimates additional public charging points required under configurable planning targets and EV-growth forecasts.

---

## 2. Problem Statement

EV registration data and public charging-station data are maintained in separate systems. VAHAN provides vehicle-registration analytics, while charging-station information is distributed across BEE EV Yatra, private operator applications, and open registries such as Open Charge Map.

Because these datasets are not consistently integrated, planners cannot easily answer:

- Which districts have high EV adoption but inadequate public charging?
- Which highway corridors lack chargers at appropriate spacing?
- How many additional public charging points are required in each district?
- Which areas should be prioritized for public and private investment?
- How will charging requirements change as EV adoption grows?

This platform addresses these gaps through data integration, spatial analysis, gap assessment, and charger-requirement estimation.

---

## 3. Objectives

1. Integrate and map existing public EV charging infrastructure across India.
2. Use VAHAN vehicle-registration data to assess EV population by fuel type, vehicle category, state/UT, district, and time period.
3. Identify underserved districts, cities, and highway corridors.
4. Estimate current and future public charging-point requirements.
5. Provide explainable priority rankings and recommendations for planners.
6. Support scalable integration of official VAHAN, BEE, CPO, and government GIS data feeds.

---

## 4. Scope and Assumptions

### 4.1 Geographic scope

The prototype focuses on Uttar Pradesh and covers:

- State-level overview
- All Uttar Pradesh districts
- National highways passing through the state
- Selected city and corridor drill-downs

The same methodology can scale to all Indian states and Union Territories.

### 4.2 EV definition

An EV is defined as a vehicle with:

```text
fuel_type = ELECTRIC
```

EV population is segmented into:

- Two-wheelers
- Three-wheelers
- Four-wheelers
- Buses
- Goods vehicles
- Other categories

### 4.3 Public charger definition

A public charging station is a charging location accessible to the general public. A charging point refers to an individual connector or charging unit within a station.

The platform counts both:

- Public charging stations
- Public charging points

Charging points are used for demand-supply calculations because one station may contain multiple chargers.

### 4.4 Planning target

The default planning target is:

```text
100 EVs per public charging point
```

This target is configurable. Dense urban districts may use a lower target, while low-density rural districts may use a higher target.

### 4.5 Data availability

Where official or live data is unavailable, the platform uses open data, manually exported data, or clearly labeled synthetic sample data. Synthetic records are marked as:

```text
source_system = SYNTHETIC
data_quality_flag = SAMPLE
```

Synthetic data is used only for prototype demonstration and must not be represented as official VAHAN, BEE, or Government of India data.

---

## 5. Data Sources

| Data Layer | Source | Access Method | Key Fields | Role |
|---|---|---|---|---|
| EV population | VAHAN / Parivahan | Public dashboard reports, configurable API, CSV ingestion | State/UT, district, fuel type, vehicle category, registration count, period | Demand layer |
| Public chargers | BEE EV Yatra | Public portal, station details, export or controlled ingestion | Station name, operator, location, charging points, connector type | Primary supply layer |
| Charger fallback | Open Charge Map | REST POI API | Station name, operator, city/state, latitude, longitude, charger count, connector type | Supplementary supply layer |
| CPO data | Charge Point Operator APIs | OCPI-style or custom REST API | Location, operator, EVSE, connectors, power, availability | Live supply and availability layer |
| Administrative boundaries | Government GIS / open GeoJSON | GeoJSON ingestion | State and district polygons, codes, names | Spatial join and choropleth layer |
| Highway network | OpenStreetMap / government GIS | Overpass API or GeoJSON | Highway code, name, geometry, road class | Corridor planning layer |
| Enrichment data | Census, economic, tourism, logistics, utility datasets | CSV/API ingestion | Population, urbanization, commercial activity, logistics, tourism, grid capacity | Context and demand-weighting layer |

---

## 6. Data Ingestion Strategy

The platform uses a modular ingestion pipeline. Each source has a dedicated adapter so that a new source can be added without changing the core analytical pipeline.

### 6.1 VAHAN ingestion

VAHAN data can be ingested through:

1. Official API or metadata endpoint, if available.
2. Dashboard report export.
3. Configurable scraper for publicly accessible reports.
4. CSV/Excel bulk ingestion.
5. Synthetic fallback for development and demonstration.

Required fields:

```text
state_name
district_name
vehicle_category
fuel_type
registration_count
period
```

The primary filter is:

```text
fuel_type = ELECTRIC
```

### 6.2 BEE EV Yatra ingestion

BEE EV Yatra provides public charging-station search and station-detail information. The ingestion workflow attempts to access a public JSON/API endpoint. If unavailable, it supports manually exported CSV/JSON data or a controlled ingestion process.

Required fields:

```text
station_name
operator_name
district_name
state_name
latitude
longitude
number_of_charging_points
connector_types
is_fast_charger
```

### 6.3 Open Charge Map ingestion

Open Charge Map is used as an open, API-based charger-location source.

Example API request:

```http
GET https://api.openchargemap.io/v3/poi
  ?output=json
  &countrycode=IN
  &maxresults=1000
  &compact=false
  &verbose=false
  &key=<API_KEY>
```

Required headers:

```text
X-API-Key: <API_KEY>
User-Agent: ev-infra-planner/1.0
client: ev-infra-planner
```

Mapped fields:

| Open Charge Map field | Platform field |
|---|---|
| `AddressInfo.Title` | `station_name` |
| `OperatorInfo.Title` | `operator_name` |
| `AddressInfo.Town` | `city` / `district` |
| `AddressInfo.StateOrProvince` | `state_name` |
| `AddressInfo.Latitude` | `latitude` |
| `AddressInfo.Longitude` | `longitude` |
| `AddressInfo.Postcode` | `pincode` |
| `Connections[].Quantity` | `number_of_charging_points` |
| `Connections[].ConnectionType.Title` | `connector_types` |
| `Connections[].PowerKW` | Fast-charger classification |

### 6.4 CPO API ingestion

CPO adapters support OCPI-style or custom REST APIs. A typical endpoint is:

```http
GET /locations
Authorization: Bearer <CPO_API_TOKEN>
```

The adapter extracts:

- Location name
- Operator
- Coordinates
- EVSEs
- Connectors
- Connector type
- Maximum power
- Operational status

### 6.5 Government GIS ingestion

Government GIS feeds provide administrative boundaries, road networks, and planning geographies. The platform accepts GeoJSON `FeatureCollection` data with:

```text
geography_type
geography_code
geography_name
geometry
```

Supported geography types:

```text
COUNTRY
STATE
DISTRICT
CITY
CORRIDOR
```

---

## 7. Data Cleaning Strategy

Data cleaning is performed before spatial joining and metric calculation.

### 7.1 Standardization

The pipeline standardizes:

- State and Union Territory names
- District names
- Vehicle categories
- Fuel types
- Operator names
- Connector types
- Date and period formats

Vehicle categories are normalized to:

```text
TWO_WHEELER
THREE_WHEELER
FOUR_WHEELER
BUS
GOODS_VEHICLE
OTHER
```

Fuel types are normalized to:

```text
ELECTRIC
PETROL
DIESEL
CNG
HYBRID
OTHER
```

### 7.2 Coordinate validation

Charger records are validated using India’s approximate bounding box:

```text
latitude: 6.0 to 37.5
longitude: 68.0 to 97.5
```

For the Uttar Pradesh prototype, a stricter bounding box is applied:

```text
latitude: 23.5 to 31.5
longitude: 77.0 to 85.0
```

Records with missing or invalid coordinates are flagged rather than silently deleted.

### 7.3 Duplicate charger detection

Chargers from BEE EV Yatra, Open Charge Map, and CPO APIs may overlap. Deduplication uses multiple signals:

1. Normalized station name
2. Normalized operator name
3. PIN code
4. Rounded latitude/longitude
5. Haversine distance
6. Address similarity

Two records are considered potential duplicates when:

- Their names and operators are similar.
- Their coordinates are within 75–150 meters.
- Their PIN codes or addresses match.

The surviving record retains:

```text
source_system
source_station_id
source_url
```

This preserves provenance and allows future auditing.

### 7.4 Missing-value strategy

| Missing field | Strategy |
|---|---|
| District name | Assign using spatial join with district boundary |
| Latitude/longitude | Flag as invalid; optionally geocode using address |
| Charger count | Default to number of connectors; otherwise set to 1 |
| Connector type | Mark as `UNKNOWN` |
| Operator name | Mark as `UNKNOWN` |
| Registration count | Reject if negative; retain zero values |
| Period | Infer from file metadata or ingestion date where possible |

### 7.5 Data-quality flags

Each record receives one of the following flags:

```text
OK
SAMPLE
MISSING_COORDINATE
INVALID_COORDINATE
DUPLICATE_SUSPECT
UNMATCHED_DISTRICT
STALE_RECORD
```

Data-quality issues are stored separately so that they can be reviewed without corrupting the primary dataset.

---

## 8. Data Integration Methodology

### 8.1 Spatial integration

The platform uses PostgreSQL + PostGIS in production and GeoPandas/Shapely in the Python prototype.

All geographic data is stored in:

```text
EPSG:4326 / WGS84
```

Charger points are spatially joined to district polygons using:

```sql
SELECT cs.station_id, d.district_code
FROM charging_stations cs
LEFT JOIN districts d
  ON ST_Within(cs.geometry, d.geometry);
```

In the Python prototype, the equivalent operation is:

```python
gpd.sjoin(
    charger_points,
    district_boundaries,
    how="left",
    predicate="within"
)
```

### 8.2 Administrative aggregation

After spatial joining, EV registrations and chargers are aggregated at:

- State level
- District level
- City level
- Corridor level

For each district, the platform computes:

- Total EVs
- EVs by vehicle category
- Public charging stations
- Public charging points
- Fast-charging points
- EVs per charging point
- Coverage score
- Gap score
- Priority level
- Additional chargers required

### 8.3 Charger pin-drop integration

When a user clicks a location on the map, the platform:

1. Receives latitude and longitude.
2. Identifies the containing district polygon.
3. Finds chargers within a selected radius.
4. Returns nearby charger details and distance.

This enables location-specific planning and citizen-facing charger discovery.

---

## 9. EV Demand Analysis

### 9.1 EV population

Total EV population is calculated as:

\[
EV_{total} = \sum_{c} EV_{category,c}
\]

Where categories include two-wheelers, three-wheelers, four-wheelers, buses, and goods vehicles.

### 9.2 Category-wise analysis

EV demand is analyzed separately for:

- Two-wheelers
- Three-wheelers
- Four-wheelers
- Buses
- Goods vehicles

This is important because charging behavior differs by vehicle type. A two-wheeler-heavy district may require distributed low-power charging, while a four-wheeler or bus corridor may require fast-charging infrastructure.

### 9.3 Time-period analysis

VAHAN registration data is analyzed by:

- Month
- Financial year
- Cumulative registrations
- Recent growth trend

The default planning view uses the latest available cumulative EV registration count.

---

## 10. Charging Supply Analysis

### 10.1 Charging stations versus charging points

A charging station may contain multiple charging points.

Example:

```text
1 station = 4 charging points
```

Therefore:

\[
PublicChargingPoints = \sum_{s} ChargingPoints_s
\]

### 10.2 Charger-type mix

The platform classifies chargers by connector type:

- CCS2
- Type 2 AC
- CHAdeMO
- Bharat AC
- Bharat DC
- Unknown

It also identifies fast chargers using:

```text
power >= 50 kW
```

### 10.3 Supply metrics

For each geography, the platform calculates:

\[
PublicChargingStations
\]

\[
PublicChargingPoints
\]

\[
FastChargingPoints
\]

\[
ChargerDensity = rac{PublicChargingPoints}{EV_{total}} 	imes 1000
\]

---

## 11. Gap Assessment Methodology

### 11.1 EVs per charging point

\[
EVsPerCharger = rac{EV_{total}}{PublicChargingPoints}
\]

A higher value indicates greater pressure on existing public charging infrastructure.

### 11.2 Coverage score

The coverage score compares existing charging points with the number required under the selected target.

\[
RequiredChargers = rac{EV_{total}}{TargetEVsPerCharger}
\]

\[
CoverageScore = \min\left(1, rac{PublicChargingPoints}{RequiredChargers}
ight)
\]

A coverage score of 1.0 means the existing supply meets the selected target.

### 11.3 Gap Score formula

The Gap Score combines four normalized components:

\[
GapScore = 100 	imes \left[
0.45N(EVsPerCharger) +
0.25(1 - CoverageScore) +
0.20N(DemandContext) +
0.10N(CorridorDeficit)

ight]
\]

Where:

- \(N(EVsPerCharger)\) is the normalized EV-to-charger ratio.
- \(CoverageScore\) measures supply adequacy.
- \(N(DemandContext)\) represents population, urbanization, commercial activity, logistics, and tourism demand.
- \(N(CorridorDeficit)\) represents highway charging gaps.
- \(N(\cdot)\) denotes min-max normalization.

### 11.4 Default weights

| Component | Weight | Rationale |
|---|---:|---|
| EVs per charger | 45% | Direct demand-supply mismatch |
| Coverage deficit | 25% | Shortfall against planning target |
| Demand context | 20% | Current and future non-registration demand |
| Corridor deficit | 10% | Highway and intercity connectivity |

All weights are configurable so planners can test alternative policy scenarios.

### 11.5 Priority classification

| Gap Score | Priority | Recommended action |
|---:|---|---|
| 75–100 | CRITICAL | Immediate charger expansion and detailed location study |
| 55–74 | HIGH | Include in near-term expansion plan |
| 35–54 | MEDIUM | Monitor and plan medium-term expansion |
| 0–34 | LOW | Maintain coverage and reassess after EV growth |

### 11.6 Worked example

Assume a district has:

- 40,000 EVs
- 300 public charging points
- Target: 100 EVs per charger
- Normalized demand context: 0.70
- Normalized corridor deficit: 0.40

EVs per charger:

\[
EVsPerCharger = rac{40000}{300} = 133.3
\]

Required chargers:

\[
rac{40000}{100} = 400
\]

Coverage score:

\[
CoverageScore = rac{300}{400} = 0.75
\]

Gap Score:

\[
GapScore = 100 	imes [
0.45(0.80) +
0.25(1 - 0.75) +
0.20(0.70) +
0.10(0.40)
]
\]

\[
GapScore = 60.25
\]

Therefore, the district is classified as **HIGH priority**.

---

## 12. Charger Requirement Forecasting

### 12.1 Forecasting method

The platform uses a configurable compound-growth model:

\[
ForecastEV_{t+n} = EV_t 	imes (1+g)^n
\]

Where:

- \(EV_t\) is the current EV population.
- \(g\) is the annual EV growth rate.
- \(n\) is the forecast horizon in years.

Default assumptions:

```text
Annual EV growth rate = 18%
Forecast horizon = 3 years
Target EVs per charger = 100
```

### 12.2 Charger requirement

\[
RequiredChargers = rac{ForecastEV_{t+n}}{TargetEVsPerCharger}
\]

\[
AdditionalChargers = \max(0, RequiredChargers - ExistingChargers)
\]

### 12.3 Worked forecast example

Assume:

- Current EVs: 40,000
- Existing public charging points: 300
- Annual EV growth: 18%
- Forecast horizon: 3 years
- Target: 100 EVs per charger

Forecast EV population:

\[
ForecastEV = 40000 	imes (1.18)^3
\]

\[
ForecastEV = 65,632
\]

Required chargers after three years:

\[
rac{65,632}{100} = 657
\]

Additional chargers required:

\[
657 - 300 = 357
\]

Therefore, the district requires approximately **357 additional public charging points** over three years to maintain the selected planning target.

### 12.4 Scenario analysis

The dashboard allows planners to vary:

- Target EVs per charger
- Forecast horizon
- Annual EV growth rate
- Vehicle-category focus
- Priority threshold

This supports comparison of conservative, moderate, and aggressive expansion scenarios.

---

## 13. Highway Corridor Methodology

### 13.1 Corridor buffer

Each national highway is buffered by 5 km on both sides:

```text
Buffer distance = 5 km
```

Chargers within this buffer are considered corridor-serving chargers.

### 13.2 Spacing analysis

The highway is sampled at intervals of 25 km. For each sample point, the platform calculates the distance to the nearest public charger.

A sample point is considered uncovered when:

\[
NearestChargerDistance > 25 km
\]

### 13.3 Corridor coverage

\[
CorridorCoverage = rac{CoveredSamplePoints}{TotalSamplePoints} 	imes 100
\]

### 13.4 Additional corridor chargers

\[
RecommendedAdditionalChargers = \max\left(0, rac{HighwayLength}{25} - ExistingCorridorChargers
ight)
\]

Candidate locations include:

- Toll plazas
- Fuel stations
- Rest areas
- Industrial clusters
- Major highway junctions
- Logistics hubs
- Tourist destinations

---

## 14. Enrichment Indicators

Optional enrichment indicators improve the demand-context component of the Gap Score.

| Indicator | Unit | Planning use |
|---|---|---|
| Population | Persons | Baseline demand |
| Urbanization rate | Percent | Higher likelihood of public charging demand |
| Commercial activity index | Index | Workplace and retail charging demand |
| Logistics activity index | Index | Freight and fleet charging demand |
| Tourism opportunity index | Index | Tourist-route charging demand |
| Grid/utility capacity index | Index | Feasibility of charger deployment |

These indicators are normalized before being used in the Gap Score.

---

## 15. Validation and Quality Assurance

The methodology includes the following checks:

1. Schema validation for every ingested dataset.
2. Coordinate validation for charger locations.
3. Duplicate detection across charger sources.
4. Spatial validation of district assignment.
5. Cross-source comparison of charger counts.
6. Manual verification for selected high-EV districts.
7. Sensitivity analysis for Gap Score weights.
8. Sensitivity analysis for target EVs per charger.
9. Sensitivity analysis for EV growth rate.
10. Data-freshness monitoring.

---

## 16. Limitations

- VAHAN’s public dashboard may not expose a stable public API.
- BEE EV Yatra and Open Charge Map coverage may be incomplete or duplicated.
- Charger coordinates may be approximate.
- Registered EVs are not identical to actively used EVs.
- Real-time charger availability is out of scope for the current prototype.
- Synthetic data must be clearly labeled and should not be used for official planning decisions.
- Charger-requirement estimates are planning indicators, not implementation approvals.

---

## 17. Scalability Roadmap

### Phase 1: Prototype

- Sample/open data
- District-level analysis
- Static refresh
- Uttar Pradesh demonstration

### Phase 2: State scale

- VAHAN report ingestion
- BEE EV Yatra station data
- Verified district boundaries
- Scheduled data refresh
- State-level dashboards

### Phase 3: National scale

- Official government GIS feeds
- CPO/OCPI integrations
- PostgreSQL + PostGIS
- Automated ingestion pipelines
- National district and corridor analysis

### Phase 4: Operational platform

- Live charger availability
- Grid-capacity integration
- Role-based access
- Forecast monitoring
- Investment-planning workflows
- Public-facing charger discovery

---

## 18. Conclusion

This methodology converts fragmented EV registration and charging-infrastructure data into a unified, explainable planning framework. By combining VAHAN-derived EV demand, public charger supply, administrative boundaries, and highway corridors, the platform identifies underserved areas and estimates future charging requirements.

The Gap Score provides a transparent prioritization mechanism, while the charger-requirement model supports scenario-based infrastructure planning. The modular adapter architecture allows the platform to scale from a Uttar Pradesh prototype to a nationwide decision-support system.
