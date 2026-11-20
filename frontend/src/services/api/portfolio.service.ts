import { toApiError } from "@/lib/apiError";
import type { PortfolioService } from "../contracts";
import { unwrapData } from "./envelope";
import { http } from "./http";
import { toPortfolioState, toTradeOutcome, toTransactionsPage } from "./portfolio.mapper";

/** The simulated account lives on the server (MongoDB). Every request needs a signed-in user. */
export const apiPortfolioService: PortfolioService = {
  async getPortfolio() {
    try {
      const response = await http.get<unknown>("/portfolio");
      return toPortfolioState(unwrapData(response.data, "portfolio"));
    } catch (error) {
      throw toApiError(error);
    }
  },

  async trade(order) {
    try {
      const response = await http.post<unknown>("/portfolio/trades", order);
      return toTradeOutcome(unwrapData(response.data, "portfolio"));
    } catch (error) {
      throw toApiError(error);
    }
  },

  async reset() {
    try {
      const response = await http.post<unknown>("/portfolio/reset");
      return toPortfolioState(unwrapData(response.data, "portfolio"));
    } catch (error) {
      throw toApiError(error);
    }
  },

  async listTransactions(query) {
    try {
      const response = await http.get<unknown>("/transactions", {
        params: { ...query, search: query.search.trim() === "" ? undefined : query.search.trim() },
      });
      return toTransactionsPage(unwrapData(response.data, "transactions"));
    } catch (error) {
      throw toApiError(error);
    }
  },
};
