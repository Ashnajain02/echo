
import React from 'react';
import { WeatherData } from '@/types';
import { cn } from '@/lib/utils';
import {
  CloudSun,
  CloudRain,
  Droplet,
  CloudMoonRain,
  Cloud,
  RefreshCw,
  MapPin,
  Sun,
  Snowflake,
  CloudLightning
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTemperatureUnit } from '@/hooks/useTemperatureUnit';
import { formatTemperature } from '@/utils/temperature';

interface WeatherDisplayProps {
  weatherData: WeatherData | null;
  isLoading: boolean;
  className?: string;
  onRefresh?: () => void;
}

const ICON_CLASS = "h-5 w-5 text-muted-foreground";

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  'cloud-sun': <CloudSun className={ICON_CLASS} />,
  'cloud-rain': <CloudRain className={ICON_CLASS} />,
  'thermometer-sun': <Sun className={ICON_CLASS} />,
  'thermometer-snowflake': <Snowflake className={ICON_CLASS} />,
  'droplet': <Droplet className={ICON_CLASS} />,
  'cloud-moon-rain': <CloudMoonRain className={ICON_CLASS} />,
  'cloud-lightning': <CloudLightning className={ICON_CLASS} />,
  'cloud': <Cloud className={ICON_CLASS} />,
};

const getWeatherIcon = (iconName: string) =>
  WEATHER_ICONS[iconName] ?? WEATHER_ICONS['cloud'];

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({
  weatherData,
  isLoading,
  className,
  onRefresh
}) => {
  const temperatureUnit = useTemperatureUnit();
  const formatTemp = (celsius: number) => formatTemperature(celsius, temperatureUnit);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-5 w-5 animate-pulse rounded-full bg-muted"></div>
        <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <Button 
        onClick={onRefresh} 
        variant="ghost" 
        size="sm" 
        className="text-muted-foreground text-xs h-8"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Get weather
      </Button>
    );
  }

  // Location validity is now handled upstream in getWeatherForLocation
  const hasValidLocation = Boolean(weatherData.location?.trim());

  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      {getWeatherIcon(weatherData.icon)}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatTemp(weatherData.temperature)}
        </span>
        {weatherData.description && (
          <>
            <span>·</span>
            <span className="capitalize">{weatherData.description}</span>
          </>
        )}
        {hasValidLocation && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {weatherData.location}
            </span>
          </>
        )}
      </div>
      
      {onRefresh && (
        <Button 
          onClick={onRefresh}
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <RefreshCw className="h-3 w-3" />
          <span className="sr-only">Refresh weather</span>
        </Button>
      )}
    </div>
  );
};

export default WeatherDisplay;
