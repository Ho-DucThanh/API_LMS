import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import typeOrmConfig from './config/typeOrmConfig';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as morgan from 'morgan';

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig)],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(morgan('dev')).forRoutes('*');
  }
}
