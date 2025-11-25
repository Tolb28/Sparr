import React from "react";
import { ScrollView } from "react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
  Search,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from "lucide-react-native";

interface FeedPostProps {
  type?: "default" | "textOnly";
}

export default function DiscoveryScreen() {
  return (
    <Box className="flex-1 bg-gray-100">
      {/* Search Bar */}
      <Box className="p-3 bg-white shadow-sm border-b border-gray-200">
        <HStack className="border border-gray-300 rounded-lg items-center px-2 py-1 gap-2">
          <Input className="flex-1 border-0 bg-transparent">
            <InputField placeholder="Search..." />
          </Input>
          <Icon as={Search} size="lg" className="text-gray-600" />
        </HStack>
      </Box>

      {/* FEED LIST */}
      <ScrollView contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}>
        <FeedPost type="default" />
        <FeedPost type="textOnly" />
        <FeedPost type="default" />
      </ScrollView>
    </Box>
  );
}

/* ------------------------------
   Feed Post Component
-------------------------------- */

function FeedPost({ type = "default" }: FeedPostProps) {
  return (
    <Box className="bg-white mx-3 mb-3 p-3 rounded-lg border border-gray-200">
      {/* User Row */}
      <HStack className="items-center mb-3 gap-2">
        <Icon as={User} size="lg" className="text-gray-700" />
        <Text className="font-bold text-base">Profile_Name</Text>
      </HStack>

      {type !== "textOnly" && (
        <Box className="bg-gray-200 rounded-md mb-3 justify-center items-center aspect-square">
          <Icon as={MessageCircle} size="xl" className="text-gray-500" />
        </Box>
      )}

      {type === "textOnly" && (
        <Text className="text-gray-700 leading-5 mb-3">
          Lorem ipsum dolor sit amet et delectus accommodare his consul copiosae
          legendos at vix ad putent delectus delicata usu.
        </Text>
      )}

      {/* Reactions */}
      <HStack className="gap-4 items-center mb-3">
        <HStack className="items-center gap-1">
          <Icon as={ThumbsUp} size="md" className="text-gray-600" />
          <Text className="text-sm text-gray-700">70</Text>
        </HStack>

        <HStack className="items-center gap-1">
          <Icon as={ThumbsDown} size="md" className="text-gray-600" />
          <Text className="text-sm text-gray-700">70</Text>
        </HStack>

        <HStack className="items-center gap-1">
          <Icon as={MessageCircle} size="md" className="text-gray-600" />
          <Text className="text-sm text-gray-700">70</Text>
        </HStack>
      </HStack>

      {/* Description */}
      {type !== "textOnly" && (
        <Text className="text-gray-700 text-sm">
          <Text className="font-bold">Profile_Name </Text>
          Lorem ipsum dolor sit amet et delectus accommodare his consul copiosae
          legendos at vix ad putent delectus delicata usu.
        </Text>
      )}
    </Box>
  );
}

