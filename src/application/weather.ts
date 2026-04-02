import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../domain/error/errors";

// Solar context calculation based on weather conditions
function calculateSolarContext(cloudCover: number, temperature: number, windSpeed: number) {
  let rating: string;
  let emoji: string;
  let description: string;
  let efficiencyPercent: number;

  // Cloud cover is the PRIMARY factor for solar production
  if (cloudCover < 20) {
    rating = "Excellent";
    emoji = "☀️";
    description = "Clear skies. Peak solar production expected.";
    efficiencyPercent = 95;
  } else if (cloudCover < 40) {
    rating = "Good";
    emoji = "🌤️";
    description = "Light cloud cover. Good solar production expected.";
    efficiencyPercent = 80;
  } else if (cloudCover < 60) {
    rating = "Moderate";
    emoji = "⛅";
    description = "Moderate cloud cover. Reduced solar production.";
    efficiencyPercent = 60;
  } else if (cloudCover < 80) {
    rating = "Fair";
    emoji = "🌥️";
    description = "Heavy cloud cover. Limited solar production.";
    efficiencyPercent = 35;
  } else {
    rating = "Poor";
    emoji = "☁️";
    description = "Overcast skies. Minimal solar production.";
    efficiencyPercent = 15;
  }

  // Temperature adjustment: panels lose efficiency above 25°C (~0.4% per degree)
  if (temperature > 25) {
    const heatLoss = Math.min((temperature - 25) * 0.4, 15); // cap at 15% loss
    efficiencyPercent = Math.max(efficiencyPercent - heatLoss, 5);
    if (temperature > 40) {
      description += " ⚠️ High temp may reduce panel efficiency.";
    }
  }

  // Wind helps cool panels (slight bonus)
  if (windSpeed > 10 && temperature > 30) {
    efficiencyPercent = Math.min(efficiencyPercent + 3, 100);
  }

  // Safety warning for extreme wind
  if (windSpeed > 50) {
    description += " ⚠️ High winds — check panel mounting.";
  }

  return {
    rating,
    emoji,
    description,
    efficiencyPercent: Math.round(efficiencyPercent),
  };
}

// Helper to format ISO date string to simple time
function formatTime(isoString: string): string {
  if (!isoString) return "--:--";
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const getWeatherData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lat, lng } = req.query;

    // Validate that lat and lng are provided
    if (!lat || !lng) {
      throw new ValidationError("Latitude (lat) and Longitude (lng) are required query parameters.");
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ValidationError("Latitude and Longitude must be valid numbers.");
    }

    // Fetch weather data from Open-Meteo API (free, no key required)
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,cloud_cover,wind_speed_10m,relative_humidity_2m&daily=sunrise,sunset,uv_index_max&timezone=auto`;

    // Fetch city name via Nominatim reverse geocoding (OpenStreetMap — free, no key)
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10&accept-language=en`;

    // Fetch both in parallel for speed
    const [weatherResponse, geoResponse] = await Promise.all([
      fetch(openMeteoUrl),
      fetch(nominatimUrl, {
        headers: { "User-Agent": "SanSolar-App/1.0" }, // Nominatim requires User-Agent
      }),
    ]);

    if (!weatherResponse.ok) {
      throw new Error("Failed to fetch weather data from Open-Meteo API.");
    }

    const data = (await weatherResponse.json()) as any;

    // Get the actual city/town name from reverse geocoding
    let locationName = "Unknown";
    try {
      if (geoResponse.ok) {
        const geoData = (await geoResponse.json()) as any;
        // Nominatim returns address with city, town, village, etc.
        const rawName =
          geoData.address?.city ||
          geoData.address?.town ||
          geoData.address?.village ||
          geoData.address?.county ||
          geoData.address?.state ||
          data.timezone?.split("/")[1]?.replace("_", " ") ||
          "Unknown";

        // Clean up administrative suffixes (e.g., "Kurunegala M.C. Limit" → "Kurunegala")
        locationName = rawName
          .replace(/\s*(M\.?C\.?\s*Limit|U\.?C\.?\s*Limit|P\.?S\.?|District|Division)$/i, "")
          .trim();
      }
    } catch {
      // If geocoding fails, fall back to timezone-based name
      locationName = data.timezone?.split("/")[1]?.replace("_", " ") || "Unknown";
    }

    // Extract current weather
    const current = data.current;
    const daily = data.daily;

    // Calculate solar context
    const solarContext = calculateSolarContext(
      current.cloud_cover,
      current.temperature_2m,
      current.wind_speed_10m
    );

    // Build the response
    const weatherResponseData = {
      location: locationName,
      timezone: data.timezone,
      current: {
        temperature: Math.round(current.temperature_2m),
        windSpeed: current.wind_speed_10m,
        cloudCover: current.cloud_cover,
        humidity: current.relative_humidity_2m,
      },
      daily: {
        sunrise: formatTime(daily.sunrise[0]),
        sunset: formatTime(daily.sunset[0]),
        uvIndexMax: daily.uv_index_max?.[0] ?? null,
      },
      solarContext,
    };

    res.status(200).json(weatherResponseData);
  } catch (error) {
    next(error);
  }
};

