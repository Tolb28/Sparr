import React from "react";
import { ScrollView } from "react-native";
import {
  Box,
  Text,
  HStack,
  VStack,
  Input,
  InputField,
  Pressable,
  Icon,
} from "@gluestack-ui/themed";
import {
  Search,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Calendar,
  Hammer,
  Home,
  ClipboardList,
} from "lucide-react-native";

interface FeedPostProps {
  type?: "default" | "textOnly";
}

export default function DiscoveryScreen() {
  return (
    <Box flex={1} bg="$backgroundLight100">
      {/* Search Bar */}
      <Box p="$3" bg="$white" softShadow="1">
        <HStack
          borderWidth={1}
          borderColor="$coolGray300"
          rounded="$lg"
          alignItems="center"
          p="$2"
        >
          <Input flex={1}>
            <InputField placeholder="Search..." />
          </Input>

          <Icon as={Search} size="lg" ml="$2" />
        </HStack>
      </Box>

      {/* FEED LIST */}
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <FeedPost type="default" />
        <FeedPost type="textOnly" />
      </ScrollView>
    </Box>
  );
}

/* ------------------------------
   Feed Post Component
-------------------------------- */

function FeedPost({ type = "default" }: FeedPostProps) {
  return (
    <Box bg="$white" m="$3" p="$3" rounded="$lg" softShadow="1">
      {/* User Row */}
      <HStack alignItems="center" mb="$2">
        <Icon as={User} size="xl" mr="$2" />
        <Text fontWeight="$bold">Profile_Name</Text>
      </HStack>

      {type !== "textOnly" && (
        <Box
          bg="$coolGray200"
          height={180}
          rounded="$md"
          justifyContent="center"
          alignItems="center"
          mb="$2"
        >
          <Icon as={ClipboardList} size="xl" color="$coolGray500" />
        </Box>
      )}

      {/* Image only if not textOnly */}
      {type == "textOnly" && (
        <Text>
        Lorem ipsum dolor sit amet et delectus accommodare his consul copiosae
        legendos at vix ad putent delectus delicata usu.
      </Text>
    
      )}

      {/* Reactions */}
      <HStack space="lg" alignItems="center" mb="$2">
        <HStack alignItems="center">
          <Icon as={ThumbsUp} size="md" mr="$1" />
          <Text>70</Text>
        </HStack>

        <HStack alignItems="center">
          <Icon as={ThumbsDown} size="md" mr="$1" />
          <Text>70</Text>
        </HStack>

        <HStack alignItems="center">
          <Icon as={MessageCircle} size="md" mr="$1" />
          <Text>70</Text>
        </HStack>
      </HStack>

      {/* Description */}
      {type !== "textOnly" && (
        <Text>
        <Text fontWeight="$bold">Profile_Name </Text>
        Lorem ipsum dolor sit amet et delectus accommodare his consul copiosae
        legendos at vix ad putent delectus delicata usu.
      </Text>
    
      )}
    </Box>
  );
}

