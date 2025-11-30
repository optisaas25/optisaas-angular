import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client, ClientStats } from '../../../shared/interfaces/client.interface';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ClientsService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/clients`;

    findAll(filter?: any): Observable<Client[]> {
        let params = new HttpParams();
        if (filter) {
            Object.keys(filter).forEach(key => {
                if (filter[key]) {
                    params = params.set(key, filter[key]);
                }
            });
        }
        return this.http.get<Client[]>(this.apiUrl, { params });
    }

    findOne(id: string): Observable<Client> {
        return this.http.get<Client>(`${this.apiUrl}/${id}`);
    }

    create(client: any): Observable<Client> {
        return this.http.post<Client>(this.apiUrl, client);
    }

    update(id: string, client: any): Observable<Client> {
        return this.http.patch<Client>(`${this.apiUrl}/${id}`, client);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getStats(): Observable<ClientStats> {
        return this.http.get<ClientStats>(`${this.apiUrl}/stats`);
    }

    exportClients(): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/export`, {}, { responseType: 'blob' });
    }
}
