import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private publicEndpoints = ['auth/register', 'auth/login']; // Public endpoints

    constructor(private http: HttpClient) { }

    private getHeaders(url: string): HttpHeaders {
        if (this.publicEndpoints.includes(url)) {
            return new HttpHeaders();
        }

        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    post<T>(url: string, body: any): Observable<T> {
        return this.http.post<T>(`${environment.apiUrl}/${url}`, body, { headers: this.getHeaders(url) });
    }

    get<T>(url: string): Observable<T> {
        return this.http.get<T>(`${environment.apiUrl}/${url}`, { headers: this.getHeaders(url) });
    }

    put<T>(url: string, body: any): Observable<T> {
        return this.http.put<T>(`${environment.apiUrl}/${url}`, body, { headers: this.getHeaders(url) });
    }

    delete<T>(url: string): Observable<T> {
        return this.http.delete<T>(`${environment.apiUrl}/${url}`, { headers: this.getHeaders(url) });
    }
}