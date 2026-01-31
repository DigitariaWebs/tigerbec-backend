import { Injectable, Inject } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import * as Papa from 'papaparse';
import PDFDocument from 'pdfkit';
import { SupabaseClient } from '@supabase/supabase-js';
import { CarsService } from '../cars/cars.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Car } from '../types';

@Injectable()
export class ReportsService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly carsService: CarsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async exportInventoryCSV(memberId: string, res: FastifyReply): Promise<void> {
    const cars = await this.carsService.getCars(memberId, {});

    const csvData = cars.map((car) => ({
      VIN: car.vin,
      Make: car.make || 'N/A',
      Model: car.model,
      Year: car.year,
      'Purchase Price': car.purchase_price,
      'Purchase Date': car.purchase_date || 'N/A',
      Status: car.status,
    }));

    const csv = Papa.unparse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename=inventory-${Date.now()}.csv`,
    );
    res.send(csv);
  }

  async exportSalesHistoryCSV(memberId: string, res: FastifyReply): Promise<void> {
    // Fetch cars with their sales data
    const { data: salesData } = await this.supabase
      .from('car_sales')
      .select('*, cars!inner(vin, make, model, year, purchase_price, purchase_date)')
      .eq('member_id', memberId)
      .order('sold_date', { ascending: false });

    const csvData = (salesData || []).map((sale: any) => ({
      VIN: sale.cars.vin,
      Make: sale.cars.make || 'N/A',
      Model: sale.cars.model,
      Year: sale.cars.year,
      'Purchase Price': sale.cars.purchase_price,
      'Purchase Date': sale.cars.purchase_date || 'N/A',
      'Sale Price': sale.sold_price,
      'Sale Date': sale.sold_date,
      Profit: sale.profit,
    }));

    const csv = Papa.unparse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename=sales-history-${Date.now()}.csv`,
    );
    res.send(csv);
  }

  async exportMemberAnalyticsCSV(memberId: string, res: FastifyReply): Promise<void> {
    const kpis = await this.analyticsService.getMemberKPIs(memberId);

    const csvData = [
      { Metric: 'Total Invested', Value: kpis.total_invested },
      { Metric: 'Total Gained', Value: kpis.total_gained },
      { Metric: 'Total Profit', Value: kpis.total_profit },
      { Metric: 'Profit Ratio (%)', Value: kpis.profit_ratio },
      { Metric: 'Total Cars Bought', Value: kpis.total_cars_bought },
      { Metric: 'Total Cars Sold', Value: kpis.total_cars_sold },
    ];

    const csv = Papa.unparse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename=analytics-${Date.now()}.csv`,
    );
    res.send(csv);
  }

  async exportGlobalAnalyticsCSV(res: FastifyReply): Promise<void> {
    const memberProfitData = await this.analyticsService.getMemberProfitData();
    const ageBandData = await this.analyticsService.getAgeBandAnalytics();

    // Member Profit Data
    const memberCsvData = memberProfitData.map((data) => ({
      'Member Name': data.member_name,
      'Total Invested': data.total_invested,
      Profit: data.profit,
      'Profit Ratio (%)': data.profit_ratio,
    }));

    // Age Band Data
    const ageBandCsvData = ageBandData.map((data) => ({
      'Age Band': data.age_band,
      'Cars Purchased': data.cars_purchased,
      'Total Profit': data.total_profit,
      'Profit Ratio (%)': data.profit_ratio,
      'Member Count': data.member_count,
    }));

    const memberCsv = Papa.unparse(memberCsvData);
    const ageBandCsv = Papa.unparse(ageBandCsvData);

    const combinedCsv = `Member Performance\n${memberCsv}\n\nAge Band Analytics\n${ageBandCsv}`;

    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename=global-analytics-${Date.now()}.csv`,
    );
    res.send(combinedCsv);
  }

  async generateMemberReportPDF(memberId: string, res: FastifyReply): Promise<void> {
    const kpis = await this.analyticsService.getMemberKPIs(memberId);
    const cars = await this.carsService.getCars(memberId, {});
    
    // Fetch sales data from car_sales table
    const { data: salesData } = await this.supabase
      .from('car_sales')
      .select('*, cars!inner(vin, make, model, year)')
      .eq('member_id', memberId)
      .order('sold_date', { ascending: false });

    const doc = new PDFDocument({ margin: 50 });

    res.header('Content-Type', 'application/pdf');
    res.header(
      'Content-Disposition',
      `attachment; filename=member-report-${Date.now()}.pdf`,
    );

    doc.pipe(res.raw);

    // Title
    doc.fontSize(20).text('TCT Investment Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, {
      align: 'center',
    });
    doc.moveDown(2);

    // KPIs Section
    doc.fontSize(16).text('Key Performance Indicators', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total Invested: $${kpis.total_invested}`);
    doc.text(`Total Gained: $${kpis.total_gained}`);
    doc.text(`Total Profit: $${kpis.total_profit}`);
    doc.text(`Profit Ratio: ${kpis.profit_ratio}%`);
    doc.text(`Total Cars Bought: ${kpis.total_cars_bought}`);
    doc.text(`Total Cars Sold: ${kpis.total_cars_sold}`);
    doc.moveDown(2);

    // Inventory Summary
    doc.fontSize(16).text('Inventory Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    
    const inventoryCars = cars.filter(car => car.status === 'IN_STOCK');
    if (inventoryCars.length > 0) {
      inventoryCars.slice(0, 10).forEach((car) => {
        doc.text(
          `${car.year} ${car.make || ''} ${car.model} - VIN: ${car.vin} - $${car.purchase_price}`,
        );
      });
      if (inventoryCars.length > 10) {
        doc.text(`... and ${inventoryCars.length - 10} more`);
      }
    } else {
      doc.text('No cars in inventory');
    }
    
    doc.moveDown(2);

    // Sales History
    doc.fontSize(16).text('Recent Sales', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    
    if (salesData && salesData.length > 0) {
      salesData.slice(0, 10).forEach((sale: any) => {
        doc.text(
          `${sale.cars.year} ${sale.cars.make || ''} ${sale.cars.model} - Sold for $${sale.sold_price} (Profit: $${sale.profit})`,
        );
      });
      if (salesData.length > 10) {
        doc.text(`... and ${salesData.length - 10} more`);
      }
    } else {
      doc.text('No sales recorded');
    }

    doc.end();
  }
}
