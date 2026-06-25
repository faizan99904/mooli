import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from './services/loading.service';

const shouldSkipLoader = (url: string): boolean => {
  return /\.(svg|png|jpe?g|gif|webp|ico|woff2?|ttf|css|js)(\?|$)/i.test(url);
};

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private readonly loading: LoadingService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    if (shouldSkipLoader(req.url)) {
      return next.handle(req);
    }

    this.loading.show();

    return next.handle(req).pipe(finalize(() => this.loading.hide()));
  }
}
