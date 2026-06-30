import {
  DynamicModule,
  type FactoryProvider,
  Global,
  Module,
  type ModuleMetadata,
  Type,
} from '@nestjs/common';
import { utilities as nestWinstonUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { AppLogger } from './logger.service';

export interface AppLoggerOptions {
  level?: string;
  isProd?: boolean;
  appName?: string;
}

export interface AppLoggerOptionsFactory {
  createLoggerOptions(): Promise<AppLoggerOptions> | AppLoggerOptions;
}

export interface AppLoggerAsyncOptions<
  TFactoryArgs extends unknown[] = unknown[],
> extends Pick<ModuleMetadata, 'imports'> {
  inject?: FactoryProvider['inject'];
  useFactory?: (
    ...args: TFactoryArgs
  ) => Promise<AppLoggerOptions> | AppLoggerOptions;
  useExisting?: Type<AppLoggerOptionsFactory>;
  useClass?: Type<AppLoggerOptionsFactory>;
}

function buildWinstonOptions(options: AppLoggerOptions) {
  const isProd = options.isProd ?? false;
  const level = options.level ?? (isProd ? 'info' : 'debug');
  const appName = options.appName ?? 'App';

  const devFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    nestWinstonUtilities.format.nestLike(appName, {
      colors: true,
      prettyPrint: true,
    }),
  );

  const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  return {
    level,
    format: isProd ? prodFormat : devFormat,
    transports: [new winston.transports.Console()],
  };
}

@Global()
@Module({})
export class AppLoggerModule {
  static forRoot(options: AppLoggerOptions = {}): DynamicModule {
    return {
      module: AppLoggerModule,
      global: true,
      imports: [WinstonModule.forRoot(buildWinstonOptions(options))],
      providers: [AppLogger],
      exports: [AppLogger, WinstonModule],
    };
  }

  static forRootAsync<TFactoryArgs extends unknown[]>(
    options: AppLoggerAsyncOptions<TFactoryArgs>,
  ): DynamicModule {
    return {
      module: AppLoggerModule,
      global: true,
      imports: [
        ...(options.imports ?? []),
        WinstonModule.forRootAsync({
          imports: options.imports,
          inject: options.inject,
          useFactory: async (...args: TFactoryArgs) => {
            if (options.useFactory) {
              const o = await options.useFactory(...args);
              return buildWinstonOptions(o);
            }
            throw new Error(
              'AppLoggerModule.forRootAsync requires useFactory at the moment.',
            );
          },
        }),
      ],
      providers: [AppLogger],
      exports: [AppLogger, WinstonModule],
    };
  }
}
