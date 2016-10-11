type FilePath = string;
type URLString = string;

interface Config {
  theme?: FilePath;
  homeUrl?: URLString;
  catalogBase?: URLString;
  catalogName?: string;
  appName?: string;
  authPlugins?: {
    [key: string]: FilePath;
  };
}

export default Config;