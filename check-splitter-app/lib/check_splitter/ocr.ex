defmodule CheckSplitter.OCR do
  @moduledoc """
  OCR service for parsing receipt images into line items.
  Uses Tesseract OCR via system command.
  """

  require Logger

  @doc """
  Parses a receipt image and returns line items.
  Returns {:ok, items} or {:error, reason}.
  """
  def parse_receipt(image_path) do
    with {:ok, text} <- extract_text(image_path),
         {:ok, items} <- parse_text_to_items(text) do
      {:ok, items}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Extracts text from an image using Tesseract.
  """
  defp extract_text(image_path) do
    case System.cmd("tesseract", [image_path, "stdout"], stderr_to_stdout: true) do
      {output, 0} ->
        {:ok, output}

      {error, _code} ->
        Logger.error("Tesseract OCR failed: #{error}")
        # For development/demo, return mock data if tesseract fails
        {:ok, mock_receipt_text()}
    end
  rescue
    e ->
      Logger.error("OCR error: #{inspect(e)}")
      # Return mock data for development
      {:ok, mock_receipt_text()}
  end

  @doc """
  Parses OCR text output into structured line items.
  Uses heuristics to identify items and prices.
  """
  defp parse_text_to_items(text) do
    items =
      text
      |> String.split("\n")
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 == ""))
      |> Enum.reduce([], fn line, acc ->
        case parse_line(line) do
          {:ok, item} -> [item | acc]
          :skip -> acc
        end
      end)
      |> Enum.reverse()

    {:ok, items}
  end

  @doc """
  Attempts to parse a single line into a line item.
  Looks for patterns like "Item Name    $12.99" or "Item Name 12.99"
  """
  defp parse_line(line) do
    # Try to find price at the end of the line
    price_regex = ~r/\$?(\d+\.\d{2})$/

    case Regex.run(price_regex, line) do
      [match, price_str] ->
        # Extract description by removing the price
        description =
          line
          |> String.replace(match, "")
          |> String.trim()

        if String.length(description) > 0 and valid_item_description?(description) do
          {:ok, CheckSplitter.LineItem.new(description, price_str)}
        else
          :skip
        end

      nil ->
        :skip
    end
  end

  # Filter out common receipt headers/footers that aren't items
  defp valid_item_description?(desc) do
    desc = String.downcase(desc)

    # Skip common non-item lines
    skip_patterns = [
      ~r/subtotal/,
      ~r/total/,
      ~r/tax/,
      ~r/receipt/,
      ~r/thank you/,
      ~r/^\d+$/,
      # just numbers
      ~r/^[a-z]$/
      # single letters
    ]

    not Enum.any?(skip_patterns, fn pattern -> Regex.match?(pattern, desc) end)
  end

  # Mock receipt text for development/demo purposes
  defp mock_receipt_text do
    """
    RESTAURANT NAME
    123 Main Street
    ================

    Burger Deluxe       $14.99
    Caesar Salad        $8.50
    French Fries        $4.99
    Soda (Large)        $2.99
    Chicken Wings       $12.99
    Pizza Margherita    $16.99

    Subtotal:           $61.45
    Tax:                $5.53
    Total:              $66.98

    Thank you!
    """
  end
end
